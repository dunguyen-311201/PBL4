import type { ParticipantRole } from '../../domain/viewer.js';
import type { SessionAccessDeps } from '../deps.js';
import type { Principal } from '../principal.js';
import { assertHost, commit, loadSession } from '../support/session-access.js';
import { withRetry } from '../support/with-retry.js';

export class ChangeViewerRole {
  constructor(private readonly deps: SessionAccessDeps) {}

  async execute(cmd: {
    actor: Principal;
    role: ParticipantRole;
  }): Promise<{ role: ParticipantRole }> {
    assertHost(cmd.actor);
    return withRetry(async () => {
      const session = await loadSession(this.deps, cmd.actor.sessionId);
      const expected = session.version;
      session.changeRole({ role: cmd.role, now: this.deps.clock.now() });
      await commit(this.deps, session, expected);
      return { role: cmd.role };
    });
  }
}
