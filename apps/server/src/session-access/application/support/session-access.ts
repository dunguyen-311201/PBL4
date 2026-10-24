import { NoViewer, SessionClosed } from '../../domain/errors.js';
import type { RemoteSession } from '../../domain/remote-session.js';
import { SessionId } from '../../domain/value-objects/identifiers.js';
import type { SessionAccessDeps } from '../deps.js';
import { Forbidden } from '../errors.js';
import type { Principal } from '../principal.js';

/** Loads the session named in the caller's token. A missing session is a closed one. */
export async function loadSession(
  deps: SessionAccessDeps,
  sessionId: string,
): Promise<RemoteSession> {
  const session = await deps.repo.findById(SessionId.of(sessionId));
  if (session === null) throw new SessionClosed('Session is closed');
  return session;
}

/** I5: only the host of this session may run host commands. */
export function assertHost(actor: Principal): void {
  if (actor.kind !== 'host') throw new Forbidden('Only the host can do this');
}

/** Host, or the approved viewer of this very session. */
export function assertHostOrViewer(actor: Principal, session: RemoteSession): 'host' | 'viewer' {
  if (actor.kind === 'host') return 'host';
  if (actor.kind === 'viewer') {
    if (session.viewer === null) throw new NoViewer('Session has no viewer');
    if (session.viewer.id.value !== actor.viewerId)
      throw new Forbidden('Not the viewer of this session');
    return 'viewer';
  }
  throw new Forbidden('A pending viewer cannot do this');
}

/**
 * Persists a changed session, then points the scheduler at its next deadline, then publishes
 * its events — in that order, so nothing is announced that was not saved. Does nothing if the
 * command did not change the session.
 */
export async function commit(
  deps: SessionAccessDeps,
  session: RemoteSession,
  expectedVersion: number,
): Promise<void> {
  if (session.version === expectedVersion) return;
  await deps.repo.save(session, expectedVersion);
  await scheduleNextCheck(deps, session);
  await deps.publisher.publish(session.pullEvents());
}

export async function scheduleNextCheck(
  deps: SessionAccessDeps,
  session: RemoteSession,
): Promise<void> {
  const next = session.nextCheckAt();
  if (next === null) await deps.scheduler.cancel(session.id.value);
  else await deps.scheduler.schedule(session.id.value, next, 'check');
}
