import { DomainError } from '../../../shared/errors/domain-error.js';
import { SessionId } from '../../domain/value-objects/identifiers.js';
import type { SessionAccessDeps } from '../deps.js';
import type { DueDeadline } from '../ports/deadline-scheduler.js';
import { commit, scheduleNextCheck } from '../support/session-access.js';
import { withRetry } from '../support/with-retry.js';

export interface DeadlineFailure {
  readonly deadline: DueDeadline;
  readonly error: unknown;
}

/**
 * Handles deadlines the scheduler found due (LLD §8). Each one is independent: a failure is
 * returned so the scheduler can retry it later, and never stops the others.
 */
export class ProcessDueDeadlines {
  constructor(private readonly deps: SessionAccessDeps) {}

  async execute(due: readonly DueDeadline[]): Promise<DeadlineFailure[]> {
    const failures: DeadlineFailure[] = [];
    for (const deadline of due) {
      try {
        if (deadline.kind === 'warn') await this.warn(deadline.sessionId);
        else await withRetry(() => this.check(deadline.sessionId));
      } catch (error) {
        // Business errors (bad id, session already closed) will not get better with a retry.
        if (!(error instanceof DomainError)) failures.push({ deadline, error });
      }
    }
    return failures;
  }

  private async check(sessionId: string): Promise<void> {
    const session = await this.deps.repo.findById(SessionId.of(sessionId));
    if (session === null) return;

    const expected = session.version;
    session.checkExpiry(this.deps.clock.now());
    if (session.version === expected)
      await scheduleNextCheck(this.deps, session); // fired early
    else await commit(this.deps, session, expected);
  }

  /** D5: the 5-minute warning is an application event, not a domain state. */
  private async warn(sessionId: string): Promise<void> {
    const session = await this.deps.repo.findById(SessionId.of(sessionId));
    if (session?.status !== 'Active' || session.activeExpiresAt === null) return;

    await this.deps.publisher.publish([
      {
        type: 'SessionExpiring',
        sessionId: session.id.value,
        occurredAt: this.deps.clock.now(),
        expiresAt: session.activeExpiresAt,
      },
    ]);
  }
}
