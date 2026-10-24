import { JoinRequestId, ViewerId } from '../../domain/value-objects/identifiers.js';
import type { ParticipantRole } from '../../domain/viewer.js';
import type { SessionAccessDeps } from '../deps.js';
import type { Principal } from '../principal.js';
import { assertHost, loadSession } from '../support/session-access.js';
import { withRetry } from '../support/with-retry.js';

export interface ApproveJoinResult {
  viewerId: string;
  role: ParticipantRole;
  activeExpiresAt: Date;
  /** Sent to the waiting viewer in `join.approved`. */
  viewerToken: string;
}

export class ApproveJoin {
  constructor(private readonly deps: SessionAccessDeps) {}

  async execute(cmd: {
    actor: Principal;
    joinRequestId: string;
    role: ParticipantRole;
  }): Promise<ApproveJoinResult> {
    assertHost(cmd.actor);
    const viewerId = ViewerId.of(this.deps.ids.uuid());
    const joinRequestId = JoinRequestId.of(cmd.joinRequestId);

    return withRetry(async () => {
      const { deps } = this;
      const session = await loadSession(deps, cmd.actor.sessionId);
      const expected = session.version;
      session.approveJoin({ joinRequestId, role: cmd.role, viewerId, now: deps.clock.now() });

      // Not `commit`: approval schedules two deadlines (check + 5-minute warning).
      const activeExpiresAt = session.activeExpiresAt as Date;
      await deps.repo.save(session, expected);
      await deps.scheduler.schedule(session.id.value, activeExpiresAt, 'check');
      await deps.scheduler.schedule(
        session.id.value,
        new Date(activeExpiresAt.getTime() - deps.config.expiryWarningBeforeMs),
        'warn',
      );
      await deps.publisher.publish(session.pullEvents());

      return {
        viewerId: viewerId.value,
        role: cmd.role,
        activeExpiresAt,
        viewerToken: deps.tokens.issueViewer(session.id.value, viewerId.value, activeExpiresAt),
      };
    });
  }
}
