import type { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RedisDeadlineScheduler } from '../../src/session-access/infrastructure/redis/redis-deadline.scheduler.js';
import { at, MINUTE } from '../builders/remote-session.builder.js';
import { connect, startRedis, uniquePrefix } from './redis.js';

const A = '5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b';
const B = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

let redis: Redis;
let stop: () => Promise<void>;
let scheduler: RedisDeadlineScheduler;
let prefix: string;

beforeAll(async () => {
  const started = await startRedis();
  stop = started.stop;
  redis = connect(started.url);
});

afterAll(async () => {
  redis.disconnect();
  await stop();
});

beforeEach(() => {
  prefix = uniquePrefix();
  scheduler = new RedisDeadlineScheduler(redis, { keyPrefix: prefix });
});

describe('RedisDeadlineScheduler', () => {
  it('returns only deadlines that are due, oldest first', async () => {
    await scheduler.schedule(A, at(10 * MINUTE), 'check');
    await scheduler.schedule(B, at(2 * MINUTE), 'warn');

    expect(await scheduler.claimDue(at(5 * MINUTE))).toEqual([{ sessionId: B, kind: 'warn' }]);
    expect(await scheduler.claimDue(at(10 * MINUTE))).toEqual([{ sessionId: A, kind: 'check' }]);
  });

  it('hands each due deadline to exactly one claimer, even when instances race (LLD §8)', async () => {
    for (let i = 0; i < 20; i++) {
      await scheduler.schedule(
        `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        at(MINUTE),
        'check',
      );
    }
    const other = new RedisDeadlineScheduler(redis, { keyPrefix: prefix });

    const [mine, theirs] = await Promise.all([
      scheduler.claimDue(at(MINUTE)),
      other.claimDue(at(MINUTE)),
    ]);

    expect(mine.length + theirs.length).toBe(20);
    const ids = new Set([...mine, ...theirs].map((d) => d.sessionId));
    expect(ids.size).toBe(20);
  });

  it('keeps one deadline per session and kind: scheduling again replaces it', async () => {
    await scheduler.schedule(A, at(MINUTE), 'check');
    await scheduler.schedule(A, at(10 * MINUTE), 'check');

    expect(await scheduler.claimDue(at(5 * MINUTE))).toEqual([]);
    expect(await scheduler.claimDue(at(10 * MINUTE))).toEqual([{ sessionId: A, kind: 'check' }]);
  });

  it('cancels every deadline of a session', async () => {
    await scheduler.schedule(A, at(MINUTE), 'check');
    await scheduler.schedule(A, at(MINUTE), 'warn');
    await scheduler.schedule(B, at(MINUTE), 'check');

    await scheduler.cancel(A);

    expect(await scheduler.claimDue(at(MINUTE))).toEqual([{ sessionId: B, kind: 'check' }]);
  });

  it('claims at most the requested batch size', async () => {
    await scheduler.schedule(A, at(MINUTE), 'check');
    await scheduler.schedule(B, at(MINUTE), 'check');
    expect(await scheduler.claimDue(at(MINUTE), 1)).toHaveLength(1);
  });
});
