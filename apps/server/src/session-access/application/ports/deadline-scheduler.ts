export type DeadlineKind = 'check' | 'warn';

export interface DueDeadline {
  readonly sessionId: string;
  readonly kind: DeadlineKind;
}

/**
 * Remembers when each session must be looked at again. At most one deadline per
 * (session, kind): scheduling again replaces the previous one.
 */
export interface DeadlineScheduler {
  schedule(sessionId: string, at: Date, kind: DeadlineKind): Promise<void>;
  cancel(sessionId: string): Promise<void>;
}
