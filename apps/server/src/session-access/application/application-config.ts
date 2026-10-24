import { DEFAULT_SESSION_POLICY, type SessionPolicy } from '../domain/session-policy.js';

export interface ApplicationConfig {
  readonly policy: SessionPolicy;
  /** How long before an active session ends to warn both sides (FR-09a, D5). */
  readonly expiryWarningBeforeMs: number;
  /** How many codes to try before giving up with CodeSpaceExhausted. */
  readonly maxCodeAttempts: number;
}

export const DEFAULT_APPLICATION_CONFIG: ApplicationConfig = Object.freeze({
  policy: DEFAULT_SESSION_POLICY,
  expiryWarningBeforeMs: 5 * 60 * 1000,
  maxCodeAttempts: 5,
});
