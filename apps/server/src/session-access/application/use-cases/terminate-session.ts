import type { SessionAccessDeps } from '../deps.js';
import type { Principal } from '../principal.js';
import { assertHostOrViewer, commit, loadSession } from '../support/session-access.js';
import { withRetry } from '../support/with-retry.js';

export class TerminateSession {
  constructor(private readonly deps: SessionAccessDeps) {}

  async execute(cmd: { actor: Principal; reason?: string }): Promise<void> {
    await withRetry(async () => {
      const session = await loadSession(this.deps, cmd.actor.sessionId);
      const by = assertHostOrViewer(cmd.actor, session);
      const expected = session.version;
      session.terminate({
        by,
        now: this.deps.clock.now(),
        ...(cmd.reason === undefined ? {} : { reason: cmd.reason }),
      });
      await commit(this.deps, session, expected);
    });
  }
}
