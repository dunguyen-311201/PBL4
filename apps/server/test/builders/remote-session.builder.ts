import { RemoteSession } from '../../src/session-access/domain/remote-session.js';
import {
  DEFAULT_SESSION_POLICY,
  type SessionPolicy,
} from '../../src/session-access/domain/session-policy.js';
import {
  JoinRequestId,
  SessionId,
  ViewerId,
} from '../../src/session-access/domain/value-objects/identifiers.js';
import { SessionCode } from '../../src/session-access/domain/value-objects/session-code.js';
import type { ParticipantRole } from '../../src/session-access/domain/viewer.js';

export const T0 = new Date('2026-10-24T10:00:00.000Z');
export const at = (ms: number) => new Date(T0.getTime() + ms);
export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;

export const IDS = {
  session: SessionId.of('5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b'),
  joinRequest: JoinRequestId.of('c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f'),
  otherJoinRequest: JoinRequestId.of('d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f60'),
  viewer: ViewerId.of('0f9e8d7c-6b5a-4c3d-9e1f-2a3b4c5d6e7f'),
};
export const CODE = SessionCode.of('482915307');
export const IP = '203.0.113.7';

type Step = (s: RemoteSession) => void;

/**
 * Builds a RemoteSession by replaying real commands, so every built state is one the aggregate
 * can actually reach. Events produced while building are discarded.
 */
export class RemoteSessionBuilder {
  private readonly steps: Step[] = [];
  private policy: SessionPolicy = DEFAULT_SESSION_POLICY;

  withPolicy(policy: Partial<SessionPolicy>): this {
    this.policy = { ...this.policy, ...policy };
    return this;
  }

  waitingForViewer(): this {
    return this;
  }

  withFailedAttempts(n: number): this {
    for (let i = 0; i < n; i++) {
      this.steps.push((s) =>
        s.requestJoin({ otpMatches: false, viewerIp: IP, joinRequestId: IDS.joinRequest, now: T0 }),
      );
    }
    return this;
  }

  locked(): this {
    return this.withFailedAttempts(this.policy.maxFailedOtpAttempts);
  }

  pendingApproval(): this {
    this.steps.push((s) =>
      s.requestJoin({ otpMatches: true, viewerIp: IP, joinRequestId: IDS.joinRequest, now: T0 }),
    );
    return this;
  }

  active(role: ParticipantRole = 'controller'): this {
    this.pendingApproval();
    this.steps.push((s) => {
      s.approveJoin({ joinRequestId: IDS.joinRequest, role, viewerId: IDS.viewer, now: T0 });
    });
    return this;
  }

  terminated(): this {
    this.steps.push((s) => {
      s.terminate({ by: 'host', now: T0 });
    });
    return this;
  }

  expired(): this {
    this.steps.push((s) => {
      s.checkExpiry(at(DEFAULT_SESSION_POLICY.waitingTtlMs + 3 * HOUR));
    });
    return this;
  }

  build(): RemoteSession {
    const session = RemoteSession.create({
      id: IDS.session,
      code: CODE,
      otpHash: 'otp-hash-1',
      now: T0,
      policy: this.policy,
    });
    for (const step of this.steps) step(session);
    session.pullEvents();
    return session;
  }
}

export const aSession = () => new RemoteSessionBuilder();
