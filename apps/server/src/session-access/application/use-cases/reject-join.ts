import { JoinRequestId } from '../../domain/value-objects/identifiers.js';
import type { SessionAccessDeps } from '../deps.js';
import type { Principal } from '../principal.js';
import { assertHost, commit, loadSession } from '../support/session-access.js';
import { withRetry } from '../support/with-retry.js';

export class RejectJoin {
  constructor(private readonly deps: SessionAccessDeps) {}

  async execute(cmd: { actor: Principal; joinRequestId: string }): Promise<void> {
    assertHost(cmd.actor);
    const joinRequestId = JoinRequestId.of(cmd.joinRequestId);
    await withRetry(async () => {
      const session = await loadSession(this.deps, cmd.actor.sessionId);
      const expected = session.version;
      session.rejectJoin({ joinRequestId, now: this.deps.clock.now() });
      await commit(this.deps, session, expected);
    });
  }
}
