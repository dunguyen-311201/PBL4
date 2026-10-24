import { describe, expect, it } from 'vitest';
import { at, HOUR, MINUTE } from '../../../../test/builders/remote-session.builder.js';
import { CODE, harness, OTP, SESSION_ID } from '../../../../test/fakes/harness.js';
import { CodeSpaceExhausted } from '../errors.js';
import { CreateSession } from './create-session.js';

describe('CreateSession', () => {
  it('returns the code, the plain OTP once, and a host token (FR-01)', async () => {
    const h = harness();

    const result = await new CreateSession(h.deps).execute();

    expect(result).toEqual({
      sessionId: SESSION_ID,
      code: CODE,
      otp: OTP,
      otpExpiresAt: at(10 * MINUTE),
      waitingExpiresAt: at(10 * MINUTE),
      hostToken: `host:${SESSION_ID}:${at(10 * MINUTE + 2 * HOUR).toISOString()}`,
    });
  });

  it('stores only the OTP hash (I9)', async () => {
    const h = harness();
    await new CreateSession(h.deps).execute();

    const stored = await h.repo.findById(h.sessionId);
    expect(stored?.otp.hash).toBe(`hashed:${OTP}`);
    expect(JSON.stringify(stored?.toSnapshot())).not.toContain(`"${OTP}"`);
  });

  it('saves, then schedules the expiry check, then publishes', async () => {
    const h = harness();
    await new CreateSession(h.deps).execute();

    expect(h.log.calls).toEqual([
      'save:WaitingForViewer',
      'schedule:check',
      'publish:SessionCreated',
    ]);
    expect(h.scheduler.get(SESSION_ID, 'check')).toEqual(at(10 * MINUTE));
  });

  it('tries another code when one is already taken', async () => {
    const h = harness({ codes: ['111111111', '222222222'] });
    await h.repo.reserveCode({ value: '111111111' }, h.sessionId);

    const result = await new CreateSession(h.deps).execute();

    expect(result.code).toBe('222222222');
  });

  it('gives up after the configured number of attempts', async () => {
    const h = harness({ codes: ['111111111'], config: { maxCodeAttempts: 3 } });
    await h.repo.reserveCode({ value: '111111111' }, h.sessionId);

    await expect(new CreateSession(h.deps).execute()).rejects.toBeInstanceOf(CodeSpaceExhausted);
  });
});
