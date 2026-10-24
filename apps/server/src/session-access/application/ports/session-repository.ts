import type { RemoteSession } from '../../domain/remote-session.js';
import type { SessionCode } from '../../domain/value-objects/session-code.js';
import type { SessionId } from '../../domain/value-objects/identifiers.js';

export interface SessionRepository {
  findById(id: SessionId): Promise<RemoteSession | null>;
  findByCode(code: SessionCode): Promise<RemoteSession | null>;
  /**
   * Saves with optimistic concurrency. Throws ConcurrencyConflict when the stored version is not
   * `expectedVersion` (0 for a new session).
   */
  save(session: RemoteSession, expectedVersion: number): Promise<void>;
  /** Reserves a unique session code. Returns false if the code is already taken. */
  reserveCode(code: SessionCode, id: SessionId, ttlMs: number): Promise<boolean>;
}
