import { DomainError } from '../../shared/errors/domain-error.js';

/**
 * Any failed join. The cause is kept for logs only; the viewer always gets the same answer so
 * it cannot tell an unknown code from a wrong OTP or a locked session (ADR-004).
 */
export class InvalidCredentials extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  constructor(readonly reason: string) {
    super('Invalid session code or OTP');
  }
}

/** The caller is authenticated but not allowed to do this (I5). */
export class Forbidden extends DomainError {
  readonly code = 'FORBIDDEN';
}

/** Another instance saved the session first; the caller may reload and retry. */
export class ConcurrencyConflict extends DomainError {
  readonly code = 'CONFLICT';
}

/** No unique session code could be reserved. */
export class CodeSpaceExhausted extends DomainError {
  readonly code = 'CODE_SPACE_EXHAUSTED';
}
