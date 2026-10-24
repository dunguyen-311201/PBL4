import { describe, expect, it } from 'vitest';
import { at, HOUR, MINUTE, SECOND } from '../../../../test/builders/remote-session.builder.js';
import {
  CODE,
  harness,
  HOST,
  IP,
  JOIN_REQUEST_ID,
  OTP,
  PENDING,
  SESSION_ID,
  VIEWER,
  VIEWER_ID,
} from '../../../../test/fakes/harness.js';
import { NoPendingJoin, SessionClosed } from '../../domain/errors.js';
import { Forbidden } from '../errors.js';
import { ApproveJoin } from './approve-join.js';
import { ChangeViewerRole } from './change-viewer-role.js';
import { CreateSession } from './create-session.js';
import { RegenerateOtp } from './regenerate-otp.js';
import { RejectJoin } from './reject-join.js';
import { RequestJoin } from './request-join.js';
import { TerminateSession } from './terminate-session.js';

const pending = async () => {
  const h = harness();
  await new CreateSession(h.deps).execute();
  await new RequestJoin(h.deps).execute({ code: CODE, otp: OTP, viewerIp: IP });
  h.publisher.published.length = 0;
  h.log.calls.length = 0;
  return h;
};

const active = async (role: 'controller' | 'observer' = 'controller') => {
  const h = await pending();
  await new ApproveJoin(h.deps).execute({ actor: HOST, joinRequestId: JOIN_REQUEST_ID, role });
  h.publisher.published.length = 0;
  h.log.calls.length = 0;
  return h;
};

describe('ApproveJoin', () => {
  it('activates the session and issues a viewer token valid until the 2-hour limit', async () => {
    const h = await pending();
    h.clock.set(at(20 * SECOND));

    const result = await new ApproveJoin(h.deps).execute({
      actor: HOST,
      joinRequestId: JOIN_REQUEST_ID,
      role: 'observer',
    });

    const activeExpiresAt = at(20 * SECOND + 2 * HOUR);
    expect(result).toEqual({
      viewerId: VIEWER_ID,
      role: 'observer',
      activeExpiresAt,
      viewerToken: `viewer:${SESSION_ID}:${VIEWER_ID}:${activeExpiresAt.toISOString()}`,
    });
    expect(h.scheduler.get(SESSION_ID, 'check')).toEqual(activeExpiresAt);
    expect(h.scheduler.get(SESSION_ID, 'warn')).toEqual(
      new Date(activeExpiresAt.getTime() - 5 * MINUTE),
    );
    expect(h.publisher.types()).toEqual(['JoinApproved']);
  });

  it.each([
    ['a viewer', VIEWER],
    ['a pending viewer', PENDING],
  ])('refuses %s (I5)', async (_label, actor) => {
    const h = await pending();
    await expect(
      new ApproveJoin(h.deps).execute({
        actor,
        joinRequestId: JOIN_REQUEST_ID,
        role: 'controller',
      }),
    ).rejects.toBeInstanceOf(Forbidden);
    expect(h.log.calls).toEqual([]);
  });

  it('reports a closed session when it no longer exists (the session is the one in the host token)', async () => {
    const h = harness();
    await expect(
      new ApproveJoin(h.deps).execute({
        actor: HOST,
        joinRequestId: JOIN_REQUEST_ID,
        role: 'controller',
      }),
    ).rejects.toBeInstanceOf(SessionClosed);
  });

  it('passes domain errors through untouched', async () => {
    const h = await active();
    await expect(
      new ApproveJoin(h.deps).execute({
        actor: HOST,
        joinRequestId: JOIN_REQUEST_ID,
        role: 'controller',
      }),
    ).rejects.toBeInstanceOf(NoPendingJoin);
  });
});

describe('RejectJoin', () => {
  it('returns to waiting and re-schedules the waiting expiry', async () => {
    const h = await pending();

    await new RejectJoin(h.deps).execute({ actor: HOST, joinRequestId: JOIN_REQUEST_ID });

    expect((await h.repo.findById(h.sessionId))?.status).toBe('WaitingForViewer');
    expect(h.scheduler.get(SESSION_ID, 'check')).toEqual(at(10 * MINUTE));
    expect(h.publisher.types()).toEqual(['JoinRejected']);
  });
});

describe('RegenerateOtp', () => {
  it('returns a new plain OTP once, stores its hash and extends the waiting window (D6)', async () => {
    const h = harness();
    await new CreateSession(h.deps).execute();
    h.clock.set(at(9 * MINUTE));

    const result = await new RegenerateOtp(h.deps).execute({ actor: HOST });

    expect(result).toEqual({ otp: '555111', otpExpiresAt: at(19 * MINUTE) });
    expect((await h.repo.findById(h.sessionId))?.otp.hash).toBe('hashed:555111');
    expect(h.scheduler.get(SESSION_ID, 'check')).toEqual(at(19 * MINUTE));
  });

  it('is host-only', async () => {
    const h = harness();
    await new CreateSession(h.deps).execute();
    await expect(new RegenerateOtp(h.deps).execute({ actor: PENDING })).rejects.toBeInstanceOf(
      Forbidden,
    );
  });
});

describe('ChangeViewerRole', () => {
  it('switches the viewer to observer immediately (FR-06, FR-24)', async () => {
    const h = await active('controller');

    const result = await new ChangeViewerRole(h.deps).execute({ actor: HOST, role: 'observer' });

    expect(result).toEqual({ role: 'observer' });
    expect((await h.repo.findById(h.sessionId))?.viewer?.role).toBe('observer');
    expect(h.publisher.types()).toEqual(['ViewerRoleChanged']);
  });

  it('writes nothing when the role is unchanged', async () => {
    const h = await active('controller');
    await new ChangeViewerRole(h.deps).execute({ actor: HOST, role: 'controller' });
    expect(h.log.calls).toEqual([]);
  });

  it('is host-only', async () => {
    const h = await active();
    await expect(
      new ChangeViewerRole(h.deps).execute({ actor: VIEWER, role: 'controller' }),
    ).rejects.toBeInstanceOf(Forbidden);
  });
});

describe('TerminateSession', () => {
  it.each([
    ['host', HOST],
    ['viewer', VIEWER],
  ] as const)(
    'lets the %s end an active session and cancels its deadlines (FR-07)',
    async (by, actor) => {
      const h = await active();

      await new TerminateSession(h.deps).execute({ actor, reason: 'done' });

      expect((await h.repo.findById(h.sessionId))?.status).toBe('Terminated');
      expect(h.log.calls).toEqual(['save:Terminated', 'cancel', 'publish:SessionTerminated']);
      expect(h.publisher.published[0]).toMatchObject({ by, reason: 'done' });
    },
  );

  it('refuses a viewer token for a different viewer', async () => {
    const h = await active();
    const stranger = {
      kind: 'viewer',
      sessionId: SESSION_ID,
      viewerId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    } as const;
    await expect(new TerminateSession(h.deps).execute({ actor: stranger })).rejects.toBeInstanceOf(
      Forbidden,
    );
  });

  it('refuses a pending viewer', async () => {
    const h = await pending();
    await expect(new TerminateSession(h.deps).execute({ actor: PENDING })).rejects.toBeInstanceOf(
      Forbidden,
    );
  });
});
