import { DomainError } from '../../shared/errors/domain-error.js';

export class InvalidIdentifier extends DomainError {
  readonly code = 'INVALID_IDENTIFIER';
}
export class InvalidSessionCode extends DomainError {
  readonly code = 'INVALID_SESSION_CODE';
}
export class InvalidOtpHash extends DomainError {
  readonly code = 'INVALID_OTP_HASH';
}

// Join attempts. Messages never reveal attempt counts (02-domain-model §4.6).
export class OtpMismatch extends DomainError {
  readonly code = 'OTP_MISMATCH';
}
export class OtpExpired extends DomainError {
  readonly code = 'OTP_EXPIRED';
}
export class OtpConsumed extends DomainError {
  readonly code = 'OTP_CONSUMED';
}
export class SessionLocked extends DomainError {
  readonly code = 'SESSION_LOCKED';
}

// State conflicts
export class JoinAlreadyPending extends DomainError {
  readonly code = 'JOIN_ALREADY_PENDING';
}
export class SessionOccupied extends DomainError {
  readonly code = 'SESSION_OCCUPIED';
}
export class NoPendingJoin extends DomainError {
  readonly code = 'NO_PENDING_JOIN';
}
export class JoinRequestExpired extends DomainError {
  readonly code = 'JOIN_REQUEST_EXPIRED';
}
export class NoViewer extends DomainError {
  readonly code = 'NO_VIEWER';
}
export class SessionClosed extends DomainError {
  readonly code = 'SESSION_CLOSED';
}

/** Errors a join attempt can end with. All of them become 401 INVALID_CREDENTIALS for the viewer. */
export type JoinError =
  | OtpMismatch
  | OtpExpired
  | OtpConsumed
  | SessionLocked
  | JoinAlreadyPending
  | SessionOccupied
  | SessionClosed;
