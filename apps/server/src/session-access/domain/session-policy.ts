const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * Business constants (02-domain-model §4.3), injected so tests and e2e runs can shrink them.
 * The 5-minute expiry warning is not here: it is an application concern (D5).
 */
export interface SessionPolicy {
  readonly waitingTtlMs: number;
  readonly otpTtlMs: number;
  readonly maxFailedOtpAttempts: number;
  readonly approvalTimeoutMs: number;
  readonly maxActiveDurationMs: number;
}

export const DEFAULT_SESSION_POLICY: SessionPolicy = Object.freeze({
  waitingTtlMs: 10 * MINUTE,
  otpTtlMs: 10 * MINUTE,
  maxFailedOtpAttempts: 5,
  approvalTimeoutMs: 60 * SECOND,
  maxActiveDurationMs: 2 * HOUR,
});
