import type { ParticipantRole } from './viewer.js';

export type SessionStatus =
  'WaitingForViewer' | 'Locked' | 'PendingApproval' | 'Active' | 'Terminated' | 'Expired';

interface Base {
  readonly sessionId: string;
  readonly occurredAt: Date;
}

/** Domain events (02-domain-model §5). They never carry the OTP, its hash or tokens. */
export type DomainEvent =
  | (Base & { readonly type: 'SessionCreated'; readonly waitingExpiresAt: Date })
  | (Base & {
      readonly type: 'JoinAttemptFailed';
      readonly viewerIp: string;
      readonly attempt: number;
    })
  | (Base & { readonly type: 'SessionLocked'; readonly viewerIp: string })
  | (Base & { readonly type: 'OtpRegenerated'; readonly expiresAt: Date })
  | (Base & {
      readonly type: 'JoinRequested';
      readonly joinRequestId: string;
      readonly viewerIp: string;
      readonly decisionDeadline: Date;
    })
  | (Base & {
      readonly type: 'JoinApproved';
      readonly viewerId: string;
      readonly role: ParticipantRole;
      readonly activeExpiresAt: Date;
    })
  | (Base & {
      readonly type: 'JoinRejected';
      readonly joinRequestId: string;
      readonly reason: 'rejected' | 'timeout';
    })
  | (Base & {
      readonly type: 'ViewerRoleChanged';
      readonly viewerId: string;
      readonly role: ParticipantRole;
    })
  | (Base & {
      readonly type: 'SessionTerminated';
      readonly by: 'host' | 'viewer';
      readonly reason?: string;
    })
  | (Base & { readonly type: 'SessionExpired'; readonly previousStatus: SessionStatus });

export type DomainEventType = DomainEvent['type'];
