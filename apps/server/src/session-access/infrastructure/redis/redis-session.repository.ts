import type { Redis } from 'ioredis';
import { ConcurrencyConflict } from '../../application/errors.js';
import type { Clock } from '../../application/ports/generators.js';
import type { SessionRepository } from '../../application/ports/session-repository.js';
import { RemoteSession, type RemoteSessionSnapshot } from '../../domain/remote-session.js';
import type { SessionId } from '../../domain/value-objects/identifiers.js';
import type { SessionCode } from '../../domain/value-objects/session-code.js';
import { SAVE_SESSION_LUA } from './save-session.lua.js';

export interface RedisSessionRepositoryOptions {
  /** Prepended to every key, e.g. "pbl4:". */
  readonly keyPrefix?: string;
  /** Kept after the next deadline so the scheduler can still load the session. */
  readonly ttlBufferMs?: number;
  /** How long a closed session stays readable, so sockets can be told it ended. */
  readonly closedRetentionMs?: number;
}

/**
 * Stores each RemoteSession as one JSON snapshot (02-domain-model §6, LLD §7).
 *
 *   {prefix}sess:{id}   → snapshot JSON with `version`
 *   {prefix}code:{code} → session id
 *
 * Redis TTLs are only a safety net for clean-up; expiry itself is decided by the aggregate via
 * the deadline scheduler, so that SessionExpired is always published.
 */
export class RedisSessionRepository implements SessionRepository {
  private readonly prefix: string;
  private readonly ttlBufferMs: number;
  private readonly closedRetentionMs: number;

  constructor(
    private readonly redis: Redis,
    private readonly clock: Clock,
    options: RedisSessionRepositoryOptions = {},
  ) {
    this.prefix = options.keyPrefix ?? 'pbl4:';
    this.ttlBufferMs = options.ttlBufferMs ?? 5 * 60 * 1000;
    this.closedRetentionMs = options.closedRetentionMs ?? 60 * 1000;
  }

  async findById(id: SessionId): Promise<RemoteSession | null> {
    const json = await this.redis.get(this.sessionKey(id.value));
    return json === null ? null : RemoteSession.restore(JSON.parse(json) as RemoteSessionSnapshot);
  }

  async findByCode(code: SessionCode): Promise<RemoteSession | null> {
    const id = await this.redis.get(this.codeKey(code.value));
    if (id === null) return null;
    const json = await this.redis.get(this.sessionKey(id));
    return json === null ? null : RemoteSession.restore(JSON.parse(json) as RemoteSessionSnapshot);
  }

  async save(session: RemoteSession, expectedVersion: number): Promise<void> {
    const next = session.nextCheckAt();
    const closed = next === null;
    const ttlMs = closed
      ? this.closedRetentionMs
      : Math.max(next.getTime() - this.clock.now().getTime(), 0) + this.ttlBufferMs;

    const saved = await this.redis.eval(
      SAVE_SESSION_LUA,
      2,
      this.sessionKey(session.id.value),
      this.codeKey(session.code.value),
      String(expectedVersion),
      JSON.stringify(session.toSnapshot()),
      String(ttlMs),
      closed ? '1' : '0',
      session.id.value,
    );
    if (saved !== 1)
      throw new ConcurrencyConflict(`Session ${session.id.value} changed since it was loaded`);
  }

  async reserveCode(code: SessionCode, id: SessionId, ttlMs: number): Promise<boolean> {
    const result = await this.redis.set(this.codeKey(code.value), id.value, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  private sessionKey(id: string): string {
    return `${this.prefix}sess:${id}`;
  }

  private codeKey(code: string): string {
    return `${this.prefix}code:${code}`;
  }
}
