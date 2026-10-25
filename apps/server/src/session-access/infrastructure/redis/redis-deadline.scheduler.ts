import type { Redis } from 'ioredis';
import type {
  DeadlineKind,
  DeadlineScheduler,
  DueDeadline,
} from '../../application/ports/deadline-scheduler.js';

const KINDS: readonly DeadlineKind[] = ['check', 'warn'];

/**
 * Deadlines live in one sorted set: member "{sessionId}:{kind}", score = due time in ms.
 * Several server instances can poll it; `claimDue` hands each deadline to exactly one of them
 * because only the instance whose ZREM succeeds keeps it (LLD session-access §8).
 */
export class RedisDeadlineScheduler implements DeadlineScheduler {
  private readonly key: string;

  constructor(
    private readonly redis: Redis,
    options: { readonly keyPrefix?: string } = {},
  ) {
    this.key = `${options.keyPrefix ?? 'pbl4:'}deadlines`;
  }

  async schedule(sessionId: string, at: Date, kind: DeadlineKind): Promise<void> {
    await this.redis.zadd(this.key, at.getTime(), member(sessionId, kind));
  }

  async cancel(sessionId: string): Promise<void> {
    await this.redis.zrem(this.key, ...KINDS.map((kind) => member(sessionId, kind)));
  }

  /** Removes and returns up to `limit` deadlines due at `now`, oldest first. */
  async claimDue(now: Date, limit = 50): Promise<DueDeadline[]> {
    const due = await this.redis.zrangebyscore(this.key, '-inf', now.getTime(), 'LIMIT', 0, limit);
    const claimed: DueDeadline[] = [];
    for (const m of due) {
      if ((await this.redis.zrem(this.key, m)) === 1) claimed.push(parse(m));
    }
    return claimed;
  }
}

const member = (sessionId: string, kind: DeadlineKind) => `${sessionId}:${kind}`;

function parse(m: string): DueDeadline {
  const at = m.lastIndexOf(':');
  return { sessionId: m.slice(0, at), kind: m.slice(at + 1) as DeadlineKind };
}
