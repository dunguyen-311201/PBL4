import type { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConcurrencyConflict } from '../../src/session-access/application/errors.js';
import { RemoteSession } from '../../src/session-access/domain/remote-session.js';
import {
  JoinRequestId,
  SessionId,
} from '../../src/session-access/domain/value-objects/identifiers.js';
import { SessionCode } from '../../src/session-access/domain/value-objects/session-code.js';
import { RedisSessionRepository } from '../../src/session-access/infrastructure/redis/redis-session.repository.js';
import { aSession, at, CODE, IDS, IP, MINUTE, T0 } from '../builders/remote-session.builder.js';
import { FixedClock } from '../fakes/in-memory.js';
import { connect, startRedis, uniquePrefix } from './redis.js';

let redis: Redis;
let stop: () => Promise<void>;
let prefix: string;
let clock: FixedClock;
let repo: RedisSessionRepository;

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
  clock = new FixedClock(T0);
  repo = new RedisSessionRepository(redis, clock, { keyPrefix: prefix });
});

const ttl = (key: string) => redis.pttl(`${prefix}${key}`);

describe('RedisSessionRepository', () => {
  it('saves a new session and reads back an equal aggregate by id and by code', async () => {
    const session = aSession().active('observer').build();
    await repo.reserveCode(CODE, IDS.session, 10 * MINUTE);

    await repo.save(session, 0);

    expect((await repo.findById(IDS.session))?.toSnapshot()).toEqual(session.toSnapshot());
    expect((await repo.findByCode(CODE))?.toSnapshot()).toEqual(session.toSnapshot());
  });

  it('returns null for unknown ids and codes', async () => {
    expect(await repo.findById(SessionId.of('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'))).toBeNull();
    expect(await repo.findByCode(SessionCode.of('999999999'))).toBeNull();
  });

  it('rejects a save whose expected version is stale (optimistic concurrency)', async () => {
    const session = aSession().build();
    await repo.save(session, 0);

    await expect(repo.save(session, 0)).rejects.toBeInstanceOf(ConcurrencyConflict);
  });

  it('rejects creating a session whose id already exists', async () => {
    await repo.save(aSession().build(), 0);
    await expect(repo.save(aSession().build(), 0)).rejects.toBeInstanceOf(ConcurrencyConflict);
  });

  it('lets only one of two concurrent joins win (I1)', async () => {
    const created = aSession().build();
    await repo.reserveCode(CODE, IDS.session, 10 * MINUTE);
    await repo.save(created, 0);

    const first = (await repo.findById(IDS.session))!;
    const second = (await repo.findById(IDS.session))!;
    first.requestJoin({ otpMatches: true, viewerIp: IP, joinRequestId: IDS.joinRequest, now: T0 });
    second.requestJoin({
      otpMatches: true,
      viewerIp: IP,
      joinRequestId: IDS.otherJoinRequest,
      now: T0,
    });

    const results = await Promise.allSettled([
      repo.save(first, created.version),
      repo.save(second, created.version),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(ConcurrencyConflict);
    expect((await repo.findById(IDS.session))?.status).toBe('PendingApproval');
  });

  it('reserves a code only once', async () => {
    expect(await repo.reserveCode(CODE, IDS.session, MINUTE)).toBe(true);
    expect(
      await repo.reserveCode(CODE, SessionId.of('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'), MINUTE),
    ).toBe(false);
  });

  it('expires keys a little after the session’s next deadline', async () => {
    await repo.reserveCode(CODE, IDS.session, 10 * MINUTE);
    await repo.save(aSession().build(), 0); // waiting until T0 + 10'

    const sessionTtl = await ttl(`sess:${IDS.session.value}`);
    const codeTtl = await ttl(`code:${CODE.value}`);
    // 10 minutes to the deadline + 5 minutes buffer, measured from the injected clock.
    expect(sessionTtl).toBeGreaterThan(14 * MINUTE);
    expect(sessionTtl).toBeLessThanOrEqual(15 * MINUTE);
    expect(codeTtl).toBeGreaterThan(14 * MINUTE);
  });

  it('frees the code and keeps a closed session only briefly', async () => {
    await repo.reserveCode(CODE, IDS.session, 10 * MINUTE);
    const session = aSession().build();
    await repo.save(session, 0);
    const expected = session.version;
    session.terminate({ by: 'host', now: at(MINUTE) });

    await repo.save(session, expected);

    expect(await redis.exists(`${prefix}code:${CODE.value}`)).toBe(0);
    expect(await ttl(`sess:${IDS.session.value}`)).toBeLessThanOrEqual(60_000);
    expect(
      await repo.reserveCode(CODE, SessionId.of('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'), MINUTE),
    ).toBe(true);
  });

  it('does not free a code that another session has taken since', async () => {
    const session = aSession().build();
    await repo.save(session, 0); // this session never reserved CODE
    await redis.set(`${prefix}code:${CODE.value}`, 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    const expected = session.version;
    session.terminate({ by: 'host', now: T0 });

    await repo.save(session, expected);

    expect(await redis.get(`${prefix}code:${CODE.value}`)).toBe(
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    );
  });

  it('round-trips a pending join request', async () => {
    const session = aSession().pendingApproval().build();
    await repo.save(session, 0);
    const loaded = await repo.findById(IDS.session);
    expect(loaded?.pendingJoin?.id.equals(JoinRequestId.of(IDS.joinRequest.value))).toBe(true);
  });

  it('never stores the plain OTP (I9)', async () => {
    const session = RemoteSession.create({
      id: IDS.session,
      code: CODE,
      otpHash: 'hashed:093184',
      now: T0,
    });
    await repo.save(session, 0);
    const raw = await redis.get(`${prefix}sess:${IDS.session.value}`);
    expect(raw).not.toContain('"093184"');
  });
});
