import {
  JoinAlreadyPending,
  JoinRequestExpired,
  NoPendingJoin,
  NoViewer,
  OtpConsumed,
  OtpExpired,
  OtpMismatch,
  SessionClosed,
  SessionLocked,
  SessionOccupied,
  type JoinError,
} from './errors.js';
import type { DomainEvent, SessionStatus } from './events.js';
import type { JoinRequest } from './join-request.js';
import { DEFAULT_SESSION_POLICY, type SessionPolicy } from './session-policy.js';
import { JoinRequestId, SessionId, ViewerId } from './value-objects/identifiers.js';
import { OtpHash } from './value-objects/otp-hash.js';
import { SessionCode } from './value-objects/session-code.js';
import type { ParticipantRole, Viewer } from './viewer.js';

export type JoinResult = { ok: true; joinRequest: JoinRequest } | { ok: false; error: JoinError };

/** Plain, serializable state used by the repository (02-domain-model §6). */
export interface RemoteSessionSnapshot {
  id: string;
  code: string;
  status: SessionStatus;
  otp: { hash: string; expiresAt: string; consumed: boolean };
  failedOtpAttempts: number;
  pendingJoin: {
    id: string;
    viewerIp: string;
    requestedAt: string;
    decisionDeadline: string;
  } | null;
  viewer: { id: string; role: ParticipantRole; approvedAt: string } | null;
  waitingExpiresAt: string;
  activeExpiresAt: string | null;
  version: number;
  policy: SessionPolicy;
}

const CLOSED: readonly SessionStatus[] = ['Terminated', 'Expired'];
const addMs = (d: Date, ms: number) => new Date(d.getTime() + ms);
const reached = (now: Date, deadline: Date) => now.getTime() >= deadline.getTime();

/**
 * Aggregate root of the Session & Access context. Commands take `now` from the caller; the
 * aggregate never reads the clock. Every successful change bumps `version` (optimistic
 * concurrency) and records domain events that the application publishes after saving.
 */
export class RemoteSession {
  private events: DomainEvent[] = [];

  private constructor(
    readonly id: SessionId,
    readonly code: SessionCode,
    private _status: SessionStatus,
    private _otp: OtpHash,
    private _failedOtpAttempts: number,
    private _pendingJoin: JoinRequest | null,
    private _viewer: Viewer | null,
    private _waitingExpiresAt: Date,
    private _activeExpiresAt: Date | null,
    private _version: number,
    private readonly policy: SessionPolicy,
  ) {}

  // ---------------------------------------------------------------- factories

  static create(params: {
    id: SessionId;
    code: SessionCode;
    otpHash: string;
    now: Date;
    policy?: SessionPolicy;
  }): RemoteSession {
    const policy = params.policy ?? DEFAULT_SESSION_POLICY;
    const waitingExpiresAt = addMs(params.now, policy.waitingTtlMs);
    const session = new RemoteSession(
      params.id,
      params.code,
      'WaitingForViewer',
      OtpHash.issue(params.otpHash, addMs(params.now, policy.otpTtlMs)),
      0,
      null,
      null,
      waitingExpiresAt,
      null,
      1,
      policy,
    );
    session.record({ type: 'SessionCreated', occurredAt: params.now, waitingExpiresAt });
    return session;
  }

  static restore(s: RemoteSessionSnapshot): RemoteSession {
    return new RemoteSession(
      SessionId.of(s.id),
      SessionCode.of(s.code),
      s.status,
      OtpHash.restore(s.otp.hash, new Date(s.otp.expiresAt), s.otp.consumed),
      s.failedOtpAttempts,
      s.pendingJoin && {
        id: JoinRequestId.of(s.pendingJoin.id),
        viewerIp: s.pendingJoin.viewerIp,
        requestedAt: new Date(s.pendingJoin.requestedAt),
        decisionDeadline: new Date(s.pendingJoin.decisionDeadline),
      },
      s.viewer && {
        id: ViewerId.of(s.viewer.id),
        role: s.viewer.role,
        approvedAt: new Date(s.viewer.approvedAt),
      },
      new Date(s.waitingExpiresAt),
      s.activeExpiresAt === null ? null : new Date(s.activeExpiresAt),
      s.version,
      s.policy,
    );
  }

  // ---------------------------------------------------------------- read model

  get status(): SessionStatus {
    return this._status;
  }
  get otp(): OtpHash {
    return this._otp;
  }
  get failedOtpAttempts(): number {
    return this._failedOtpAttempts;
  }
  get pendingJoin(): JoinRequest | null {
    return this._pendingJoin;
  }
  get viewer(): Viewer | null {
    return this._viewer;
  }
  get waitingExpiresAt(): Date {
    return this._waitingExpiresAt;
  }
  get activeExpiresAt(): Date | null {
    return this._activeExpiresAt;
  }
  get version(): number {
    return this._version;
  }

  // ---------------------------------------------------------------- commands

  /**
   * Returns a result instead of throwing: a wrong OTP still changes state (counter, maybe
   * Locked), which the application must save before reporting the failure.
   */
  requestJoin(cmd: {
    otpMatches: boolean;
    viewerIp: string;
    joinRequestId: JoinRequestId;
    now: Date;
  }): JoinResult {
    switch (this._status) {
      case 'Terminated':
      case 'Expired':
        return fail(new SessionClosed('Session is closed'));
      case 'Locked':
        return fail(new SessionLocked('Session is locked'));
      case 'PendingApproval':
        return fail(new JoinAlreadyPending('A join request is already pending'));
      case 'Active':
        return fail(new SessionOccupied('Session already has a viewer'));
      case 'WaitingForViewer':
        break;
    }

    // Spent or expired OTPs are not guesses, so they do not count toward the lock (test 8).
    if (this._otp.consumed) return fail(new OtpConsumed('OTP has already been used'));
    if (this._otp.isExpired(cmd.now)) return fail(new OtpExpired('OTP has expired'));

    if (!cmd.otpMatches) {
      this._failedOtpAttempts += 1;
      this.record({
        type: 'JoinAttemptFailed',
        occurredAt: cmd.now,
        viewerIp: cmd.viewerIp,
        attempt: this._failedOtpAttempts,
      });
      if (this._failedOtpAttempts >= this.policy.maxFailedOtpAttempts) {
        this._status = 'Locked';
        this.record({ type: 'SessionLocked', occurredAt: cmd.now, viewerIp: cmd.viewerIp });
      }
      this.touch();
      return fail(new OtpMismatch('OTP does not match'));
    }

    const joinRequest: JoinRequest = {
      id: cmd.joinRequestId,
      viewerIp: cmd.viewerIp,
      requestedAt: cmd.now,
      decisionDeadline: addMs(cmd.now, this.policy.approvalTimeoutMs),
    };
    this._otp = this._otp.consume(); // D1
    this._failedOtpAttempts = 0;
    this._pendingJoin = joinRequest;
    this._status = 'PendingApproval';
    this.record({
      type: 'JoinRequested',
      occurredAt: cmd.now,
      joinRequestId: joinRequest.id.value,
      viewerIp: joinRequest.viewerIp,
      decisionDeadline: joinRequest.decisionDeadline,
    });
    this.touch();
    return { ok: true, joinRequest };
  }

  approveJoin(cmd: {
    joinRequestId: JoinRequestId;
    role: ParticipantRole;
    viewerId: ViewerId;
    now: Date;
  }): void {
    const pending = this.requirePendingJoin(cmd.joinRequestId);
    if (reached(cmd.now, pending.decisionDeadline)) {
      throw new JoinRequestExpired('Join request is past its decision deadline');
    }

    const activeExpiresAt = addMs(cmd.now, this.policy.maxActiveDurationMs);
    this._viewer = { id: cmd.viewerId, role: cmd.role, approvedAt: cmd.now };
    this._pendingJoin = null;
    this._activeExpiresAt = activeExpiresAt;
    this._status = 'Active';
    this.record({
      type: 'JoinApproved',
      occurredAt: cmd.now,
      viewerId: cmd.viewerId.value,
      role: cmd.role,
      activeExpiresAt,
    });
    this.touch();
  }

  rejectJoin(cmd: { joinRequestId: JoinRequestId; now: Date }): void {
    const pending = this.requirePendingJoin(cmd.joinRequestId);
    this.backToWaiting(pending, 'rejected', cmd.now);
  }

  regenerateOtp(cmd: { otpHash: string; now: Date }): void {
    this.assertOpen();
    if (this._status === 'PendingApproval')
      throw new JoinAlreadyPending('A join request is pending');
    if (this._status === 'Active') throw new SessionOccupied('Session already has a viewer');

    const expiresAt = addMs(cmd.now, this.policy.otpTtlMs);
    this._otp = OtpHash.issue(cmd.otpHash, expiresAt);
    this._failedOtpAttempts = 0;
    this._status = 'WaitingForViewer';
    // D6: the waiting window follows the OTP so a fresh OTP never outlives its session.
    this._waitingExpiresAt = addMs(cmd.now, this.policy.waitingTtlMs);
    this.record({ type: 'OtpRegenerated', occurredAt: cmd.now, expiresAt });
    this.touch();
  }

  changeRole(cmd: { role: ParticipantRole; now: Date }): void {
    this.assertOpen();
    const viewer = this._viewer;
    if (this._status !== 'Active' || viewer === null) throw new NoViewer('Session has no viewer');
    if (viewer.role === cmd.role) return;

    this._viewer = { ...viewer, role: cmd.role };
    this.record({
      type: 'ViewerRoleChanged',
      occurredAt: cmd.now,
      viewerId: viewer.id.value,
      role: cmd.role,
    });
    this.touch();
  }

  terminate(cmd: { by: 'host' | 'viewer'; reason?: string; now: Date }): void {
    this.assertOpen();
    if (cmd.by === 'viewer' && this._status !== 'Active')
      throw new NoViewer('Session has no viewer');

    this._status = 'Terminated';
    this._pendingJoin = null;
    this.record({
      type: 'SessionTerminated',
      occurredAt: cmd.now,
      by: cmd.by,
      ...(cmd.reason === undefined ? {} : { reason: cmd.reason }),
    });
    this.touch();
  }

  /** Called by the scheduler at each deadline. Does nothing if nothing is due. */
  checkExpiry(now: Date): void {
    const previousStatus = this._status;
    switch (previousStatus) {
      case 'Terminated':
      case 'Expired':
        return;
      case 'Active':
        if (this._activeExpiresAt !== null && reached(now, this._activeExpiresAt))
          this.expire(previousStatus, now);
        return;
      case 'WaitingForViewer':
      case 'Locked':
      case 'PendingApproval':
        if (reached(now, this._waitingExpiresAt)) {
          this.expire(previousStatus, now);
          return;
        }
        if (this._pendingJoin !== null && reached(now, this._pendingJoin.decisionDeadline)) {
          this.backToWaiting(this._pendingJoin, 'timeout', now); // D2
        }
        return;
    }
  }

  /**
   * The earliest moment `checkExpiry` could change something, or null when the session is
   * closed. The application schedules its next check at this time.
   */
  nextCheckAt(): Date | null {
    switch (this._status) {
      case 'Terminated':
      case 'Expired':
        return null;
      case 'Active':
        return this._activeExpiresAt;
      case 'WaitingForViewer':
      case 'Locked':
        return this._waitingExpiresAt;
      case 'PendingApproval': {
        const deadline = this._pendingJoin?.decisionDeadline ?? this._waitingExpiresAt;
        return deadline < this._waitingExpiresAt ? deadline : this._waitingExpiresAt;
      }
    }
  }

  pullEvents(): DomainEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  toSnapshot(): RemoteSessionSnapshot {
    return {
      id: this.id.value,
      code: this.code.value,
      status: this._status,
      otp: {
        hash: this._otp.hash,
        expiresAt: this._otp.expiresAt.toISOString(),
        consumed: this._otp.consumed,
      },
      failedOtpAttempts: this._failedOtpAttempts,
      pendingJoin: this._pendingJoin && {
        id: this._pendingJoin.id.value,
        viewerIp: this._pendingJoin.viewerIp,
        requestedAt: this._pendingJoin.requestedAt.toISOString(),
        decisionDeadline: this._pendingJoin.decisionDeadline.toISOString(),
      },
      viewer: this._viewer && {
        id: this._viewer.id.value,
        role: this._viewer.role,
        approvedAt: this._viewer.approvedAt.toISOString(),
      },
      waitingExpiresAt: this._waitingExpiresAt.toISOString(),
      activeExpiresAt: this._activeExpiresAt?.toISOString() ?? null,
      version: this._version,
      policy: this.policy,
    };
  }

  // ---------------------------------------------------------------- helpers

  private assertOpen(): void {
    if (CLOSED.includes(this._status)) throw new SessionClosed('Session is closed');
  }

  private requirePendingJoin(id: JoinRequestId): JoinRequest {
    this.assertOpen();
    const pending = this._pendingJoin;
    if (this._status !== 'PendingApproval' || pending === null || !pending.id.equals(id)) {
      throw new NoPendingJoin('No matching join request is pending');
    }
    return pending;
  }

  private backToWaiting(pending: JoinRequest, reason: 'rejected' | 'timeout', now: Date): void {
    this._pendingJoin = null;
    this._status = 'WaitingForViewer';
    this.record({ type: 'JoinRejected', occurredAt: now, joinRequestId: pending.id.value, reason });
    this.touch();
  }

  private expire(previousStatus: SessionStatus, now: Date): void {
    this._status = 'Expired';
    this._pendingJoin = null;
    this.record({ type: 'SessionExpired', occurredAt: now, previousStatus });
    this.touch();
  }

  private record(event: DistributiveOmit<DomainEvent, 'sessionId'>): void {
    this.events.push({ ...event, sessionId: this.id.value });
  }

  private touch(): void {
    this._version += 1;
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

const fail = (error: JoinError): JoinResult => ({ ok: false, error });
