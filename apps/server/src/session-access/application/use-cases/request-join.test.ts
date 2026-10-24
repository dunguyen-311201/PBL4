import { describe, expect, it } from 'vitest';
import { at, SECOND } from '../../../../test/builders/remote-session.builder.js';
import {
  CODE,
  harness,
  IP,
  JOIN_REQUEST_ID,
  OTP,
  SESSION_ID,
} from '../../../../test/fakes/harness.js';
import { InvalidCredentials } from '../errors.js';
import { CreateSession } from './create-session.js';
import { RequestJoin } from './request-join.js';

const setup = async () => {
  const h = harness();
  await new CreateSession(h.deps).execute();
  h.publisher.published.length = 0;
  h.log.calls.length = 0;
  return { h, requestJoin: new RequestJoin(h.deps) };
};

describe('RequestJoin', () => {
  it('creates a pending join and a short-lived pending token (FR-03)', async () => {
    const { h, requestJoin } = await setup();

    const result = await requestJoin.execute({ code: CODE, otp: OTP, viewerIp: IP });

    expect(result).toEqual({
      joinRequestId: JOIN_REQUEST_ID,
      decisionDeadline: at(60 * SECOND),
      pendingToken: `pending:${SESSION_ID}:${JOIN_REQUEST_ID}:${at(60 * SECOND).toISOString()}`,
    });
    expect(h.log.calls).toEqual([
      'save:PendingApproval',
      'schedule:check',
      'publish:JoinRequested',
    ]);
    expect(h.scheduler.get(SESSION_ID, 'check')).toEqual(at(60 * SECOND));
  });

  it('saves and publishes a wrong guess before rejecting it', async () => {
    const { h, requestJoin } = await setup();

    await expect(
      requestJoin.execute({ code: CODE, otp: '000000', viewerIp: IP }),
    ).rejects.toBeInstanceOf(InvalidCredentials);

    expect((await h.repo.findById(h.sessionId))?.failedOtpAttempts).toBe(1);
    expect(h.publisher.types()).toEqual(['JoinAttemptFailed']);
  });

  it('locks the session on the 5th wrong guess and tells the host (FR-03a)', async () => {
    const { h, requestJoin } = await setup();

    for (let i = 0; i < 5; i++) {
      await expect(
        requestJoin.execute({ code: CODE, otp: '000000', viewerIp: IP }),
      ).rejects.toBeInstanceOf(InvalidCredentials);
    }

    expect((await h.repo.findById(h.sessionId))?.status).toBe('Locked');
    expect(h.publisher.types().at(-1)).toBe('SessionLocked');
  });

  it('does not save anything when the session refuses without changing (e.g. locked)', async () => {
    const { h, requestJoin } = await setup();
    for (let i = 0; i < 5; i++)
      await requestJoin.execute({ code: CODE, otp: '000000', viewerIp: IP }).catch(() => undefined);
    h.log.calls.length = 0;

    await expect(
      requestJoin.execute({ code: CODE, otp: OTP, viewerIp: IP }),
    ).rejects.toBeInstanceOf(InvalidCredentials);

    expect(h.log.calls).toEqual([]);
  });

  it.each([
    ['an unknown code', '999999999'],
    ['a malformed code', 'abc'],
  ])(
    'rejects %s the same way, after a dummy hash check (timing, ADR-004)',
    async (_label, code) => {
      const { h, requestJoin } = await setup();

      const error = await requestJoin
        .execute({ code, otp: OTP, viewerIp: IP })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(InvalidCredentials);
      expect((error as Error).message).toBe('Invalid session code or OTP');
      expect(h.hasher.verified).toHaveLength(1);
    },
  );

  it('checks unknown codes against a real hash from the same hasher, so both paths cost the same', async () => {
    const { h, requestJoin } = await setup();
    const hashesBefore = h.hasher.hashed.length;

    await requestJoin.execute({ code: '999999999', otp: OTP, viewerIp: IP }).catch(() => undefined);
    await requestJoin.execute({ code: '888888888', otp: OTP, viewerIp: IP }).catch(() => undefined);

    expect(h.hasher.verified.map((v) => v.hash.startsWith('hashed:'))).toEqual([true, true]);
    expect(h.hasher.hashed.length - hashesBefore).toBe(1); // computed once, then reused
  });

  it('gives every failure the same message', async () => {
    const { requestJoin } = await setup();
    const wrong = await requestJoin
      .execute({ code: CODE, otp: '000000', viewerIp: IP })
      .catch((e: unknown) => e);
    const unknown = await requestJoin
      .execute({ code: '999999999', otp: OTP, viewerIp: IP })
      .catch((e: unknown) => e);
    expect((wrong as Error).message).toBe((unknown as Error).message);
  });

  it('retries once when another instance saved first', async () => {
    const { h, requestJoin } = await setup();
    h.repo.failNextSaveWithConflict = true;

    const result = await requestJoin.execute({ code: CODE, otp: OTP, viewerIp: IP });

    expect(result.joinRequestId).toBe(JOIN_REQUEST_ID);
  });
});
