import { describe, expect, it } from 'vitest';
import { at, HOUR, MINUTE, SECOND } from '../../../../test/builders/remote-session.builder.js';
import {
  CODE,
  harness,
  HOST,
  IP,
  JOIN_REQUEST_ID,
  OTP,
  SESSION_ID,
} from '../../../../test/fakes/harness.js';
import { ApproveJoin } from './approve-join.js';
import { CreateSession } from './create-session.js';
import { ProcessDueDeadlines } from './process-due-deadlines.js';
import { RequestJoin } from './request-join.js';

const created = async () => {
  const h = harness();
  await new CreateSession(h.deps).execute();
  return h;
};
const reset = (h: Awaited<ReturnType<typeof created>>) => {
  h.publisher.published.length = 0;
  h.log.calls.length = 0;
};

describe('ProcessDueDeadlines', () => {
  it('times out an unanswered join and re-schedules the waiting expiry (D2)', async () => {
    const h = await created();
    await new RequestJoin(h.deps).execute({ code: CODE, otp: OTP, viewerIp: IP });
    reset(h);
    h.clock.set(at(60 * SECOND));

    await new ProcessDueDeadlines(h.deps).execute([{ sessionId: SESSION_ID, kind: 'check' }]);

    expect((await h.repo.findById(h.sessionId))?.status).toBe('WaitingForViewer');
    expect(h.publisher.published).toEqual([
      expect.objectContaining({ type: 'JoinRejected', reason: 'timeout' }),
    ]);
    expect(h.scheduler.get(SESSION_ID, 'check')).toEqual(at(10 * MINUTE));
  });

  it('expires an active session after 2 hours and stops scheduling it (FR-09a)', async () => {
    const h = await created();
    await new RequestJoin(h.deps).execute({ code: CODE, otp: OTP, viewerIp: IP });
    await new ApproveJoin(h.deps).execute({
      actor: HOST,
      joinRequestId: JOIN_REQUEST_ID,
      role: 'controller',
    });
    reset(h);
    h.clock.set(at(2 * HOUR));

    await new ProcessDueDeadlines(h.deps).execute([{ sessionId: SESSION_ID, kind: 'check' }]);

    expect((await h.repo.findById(h.sessionId))?.status).toBe('Expired');
    expect(h.log.calls).toEqual(['save:Expired', 'cancel', 'publish:SessionExpired']);
  });

  it('warns both sides 5 minutes before an active session ends (FR-09a, D5)', async () => {
    const h = await created();
    await new RequestJoin(h.deps).execute({ code: CODE, otp: OTP, viewerIp: IP });
    await new ApproveJoin(h.deps).execute({
      actor: HOST,
      joinRequestId: JOIN_REQUEST_ID,
      role: 'controller',
    });
    reset(h);
    h.clock.set(at(2 * HOUR - 5 * MINUTE));

    await new ProcessDueDeadlines(h.deps).execute([{ sessionId: SESSION_ID, kind: 'warn' }]);

    expect(h.publisher.published).toEqual([
      {
        type: 'SessionExpiring',
        sessionId: SESSION_ID,
        occurredAt: at(2 * HOUR - 5 * MINUTE),
        expiresAt: at(2 * HOUR),
      },
    ]);
    expect(h.log.calls).toEqual(['publish:SessionExpiring']);
  });

  it('only re-schedules a check that fired early', async () => {
    const h = await created();
    reset(h);
    h.clock.set(at(5 * MINUTE));

    await new ProcessDueDeadlines(h.deps).execute([{ sessionId: SESSION_ID, kind: 'check' }]);

    expect(h.log.calls).toEqual(['schedule:check']);
    expect(h.scheduler.get(SESSION_ID, 'check')).toEqual(at(10 * MINUTE));
  });

  it('ignores a warning for a session that is no longer active', async () => {
    const h = await created();
    reset(h);
    await new ProcessDueDeadlines(h.deps).execute([{ sessionId: SESSION_ID, kind: 'warn' }]);
    expect(h.log.calls).toEqual([]);
  });

  it('skips sessions that are gone and keeps processing the rest', async () => {
    const h = await created();
    reset(h);
    h.clock.set(at(10 * MINUTE));

    await new ProcessDueDeadlines(h.deps).execute([
      { sessionId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', kind: 'check' },
      { sessionId: 'not-a-uuid', kind: 'check' },
      { sessionId: SESSION_ID, kind: 'check' },
    ]);

    expect((await h.repo.findById(h.sessionId))?.status).toBe('Expired');
  });
});
