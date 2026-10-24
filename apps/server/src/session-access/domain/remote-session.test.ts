import { describe, expect, it } from 'vitest';
import {
  aSession,
  at,
  CODE,
  HOUR,
  IDS,
  IP,
  MINUTE,
  SECOND,
  T0,
} from '../../../test/builders/remote-session.builder.js';
import {
  JoinAlreadyPending,
  JoinRequestExpired,
  NoPendingJoin,
  NoViewer,
  OtpConsumed,
  OtpExpired,
  OtpMismatch,
  SessionClosed,
  SessionLocked,
  SessionOccupied,
} from './errors.js';
import { RemoteSession, type JoinResult } from './remote-session.js';
import { DEFAULT_SESSION_POLICY } from './session-policy.js';

/** Asserts that a join attempt failed with the given domain error. */
const expectJoinError = (result: JoinResult, error: abstract new (...args: never[]) => Error) => {
  expect(result.ok).toBe(false);
  expect(result.ok ? null : result.error).toBeInstanceOf(error);
};

const join = (otpMatches: boolean, now = T0) => ({
  otpMatches,
  viewerIp: IP,
  joinRequestId: IDS.joinRequest,
  now,
});

describe('RemoteSession', () => {
  describe('create', () => {
    it('starts waiting for a viewer with a 10-minute window and announces itself (1)', () => {
      const s = RemoteSession.create({ id: IDS.session, code: CODE, otpHash: 'h', now: T0 });

      expect(s.status).toBe('WaitingForViewer');
      expect(s.waitingExpiresAt).toEqual(at(10 * MINUTE));
      expect(s.otp.expiresAt).toEqual(at(10 * MINUTE));
      expect(s.version).toBe(1);
      expect(s.pullEvents()).toEqual([
        {
          type: 'SessionCreated',
          sessionId: IDS.session.value,
          occurredAt: T0,
          waitingExpiresAt: at(10 * MINUTE),
        },
      ]);
    });
  });

  describe('requestJoin', () => {
    it('moves to PendingApproval, consumes the OTP and asks the host within 60 s (3, D1)', () => {
      const s = aSession().build();

      const result = s.requestJoin(join(true));

      expect(result.ok).toBe(true);
      expect(s.status).toBe('PendingApproval');
      expect(s.otp.consumed).toBe(true);
      expect(s.pendingJoin?.decisionDeadline).toEqual(at(60 * SECOND));
      expect(s.pullEvents()).toEqual([
        {
          type: 'JoinRequested',
          sessionId: IDS.session.value,
          occurredAt: T0,
          joinRequestId: IDS.joinRequest.value,
          viewerIp: IP,
          decisionDeadline: at(60 * SECOND),
        },
      ]);
    });

    it('counts a wrong OTP and stays waiting (4)', () => {
      const s = aSession().build();

      const result = s.requestJoin(join(false));

      expectJoinError(result, OtpMismatch);
      expect(s.status).toBe('WaitingForViewer');
      expect(s.failedOtpAttempts).toBe(1);
      expect(s.pullEvents()).toEqual([
        {
          type: 'JoinAttemptFailed',
          sessionId: IDS.session.value,
          occurredAt: T0,
          viewerIp: IP,
          attempt: 1,
        },
      ]);
    });

    it('does not reveal how many attempts are left', () => {
      const s = aSession().build();
      const result = s.requestJoin(join(false));
      expect(result.ok ? '' : result.error.message).not.toMatch(/\d/);
    });

    it('locks the session after the 5th wrong OTP (5, FR-03a)', () => {
      const s = aSession().withFailedAttempts(4).build();

      s.requestJoin(join(false));

      expect(s.status).toBe('Locked');
      expect(s.pullEvents().map((e) => e.type)).toEqual(['JoinAttemptFailed', 'SessionLocked']);
    });

    it('rejects every join while locked, even with the right OTP (6)', () => {
      const s = aSession().locked().build();
      const before = s.version;

      const result = s.requestJoin(join(true));

      expectJoinError(result, SessionLocked);
      expect(s.status).toBe('Locked');
      expect(s.version).toBe(before);
      expect(s.pullEvents()).toEqual([]);
    });

    it('rejects an expired OTP without counting it as a wrong guess (8)', () => {
      const s = aSession().build();

      const result = s.requestJoin(join(true, at(10 * MINUTE)));

      expectJoinError(result, OtpExpired);
      expect(s.failedOtpAttempts).toBe(0);
    });

    it('rejects a consumed OTP after the host rejected the viewer (D1)', () => {
      const s = aSession().pendingApproval().build();
      s.rejectJoin({ joinRequestId: IDS.joinRequest, now: T0 });

      const result = s.requestJoin(join(true));

      expectJoinError(result, OtpConsumed);
      expect(s.failedOtpAttempts).toBe(0);
    });

    it('allows only one pending join at a time (9, I1, I3)', () => {
      const s = aSession().pendingApproval().build();
      expectJoinError(s.requestJoin(join(true)), JoinAlreadyPending);
    });
  });

  describe('regenerateOtp', () => {
    it('unlocks a locked session with a fresh OTP and resets the counter (7)', () => {
      const s = aSession().locked().build();

      s.regenerateOtp({ otpHash: 'h2', now: at(2 * MINUTE) });

      expect(s.status).toBe('WaitingForViewer');
      expect(s.failedOtpAttempts).toBe(0);
      expect(s.otp.hash).toBe('h2');
      expect(s.otp.consumed).toBe(false);
      expect(s.otp.expiresAt).toEqual(at(12 * MINUTE));
      expect(s.pullEvents()).toEqual([
        {
          type: 'OtpRegenerated',
          sessionId: IDS.session.value,
          occurredAt: at(2 * MINUTE),
          expiresAt: at(12 * MINUTE),
        },
      ]);
    });

    it('extends the waiting window so the new OTP never outlives the session (D6)', () => {
      const s = aSession().build();
      s.regenerateOtp({ otpHash: 'h2', now: at(9 * MINUTE) });
      expect(s.waitingExpiresAt).toEqual(at(19 * MINUTE));
    });
  });

  describe('approveJoin', () => {
    it('activates the session with the chosen role for at most 2 hours (10)', () => {
      const s = aSession().pendingApproval().build();

      s.approveJoin({
        joinRequestId: IDS.joinRequest,
        role: 'observer',
        viewerId: IDS.viewer,
        now: at(30 * SECOND),
      });

      expect(s.status).toBe('Active');
      expect(s.viewer?.role).toBe('observer');
      expect(s.pendingJoin).toBeNull();
      expect(s.activeExpiresAt).toEqual(at(30 * SECOND + 2 * HOUR));
      expect(s.pullEvents()).toEqual([
        {
          type: 'JoinApproved',
          sessionId: IDS.session.value,
          occurredAt: at(30 * SECOND),
          viewerId: IDS.viewer.value,
          role: 'observer',
          activeExpiresAt: at(30 * SECOND + 2 * HOUR),
        },
      ]);
    });

    it('rejects an unknown join request id (11)', () => {
      const s = aSession().pendingApproval().build();
      expect(() => {
        s.approveJoin({
          joinRequestId: IDS.otherJoinRequest,
          role: 'controller',
          viewerId: IDS.viewer,
          now: T0,
        });
      }).toThrow(NoPendingJoin);
    });

    it('rejects an approval after the decision deadline (11, I6)', () => {
      const s = aSession().pendingApproval().build();
      expect(() => {
        s.approveJoin({
          joinRequestId: IDS.joinRequest,
          role: 'controller',
          viewerId: IDS.viewer,
          now: at(60 * SECOND),
        });
      }).toThrow(JoinRequestExpired);
      expect(s.status).toBe('PendingApproval');
    });
  });

  describe('rejectJoin', () => {
    it('goes back to waiting and keeps the OTP consumed (12, D1)', () => {
      const s = aSession().pendingApproval().build();

      s.rejectJoin({ joinRequestId: IDS.joinRequest, now: T0 });

      expect(s.status).toBe('WaitingForViewer');
      expect(s.pendingJoin).toBeNull();
      expect(s.otp.consumed).toBe(true);
      expect(s.pullEvents()).toEqual([
        {
          type: 'JoinRejected',
          sessionId: IDS.session.value,
          occurredAt: T0,
          joinRequestId: IDS.joinRequest.value,
          reason: 'rejected',
        },
      ]);
    });

    it('rejects an unknown join request id', () => {
      const s = aSession().pendingApproval().build();
      expect(() => {
        s.rejectJoin({ joinRequestId: IDS.otherJoinRequest, now: T0 });
      }).toThrow(NoPendingJoin);
    });
  });

  describe('changeRole', () => {
    it('switches the viewer to observer (14, D4)', () => {
      const s = aSession().active('controller').build();

      s.changeRole({ role: 'observer', now: T0 });

      expect(s.viewer?.role).toBe('observer');
      expect(s.status).toBe('Active');
      expect(s.pullEvents()).toEqual([
        {
          type: 'ViewerRoleChanged',
          sessionId: IDS.session.value,
          occurredAt: T0,
          viewerId: IDS.viewer.value,
          role: 'observer',
        },
      ]);
    });

    it('is a no-op when the role does not change', () => {
      const s = aSession().active('controller').build();
      const before = s.version;
      s.changeRole({ role: 'controller', now: T0 });
      expect(s.version).toBe(before);
      expect(s.pullEvents()).toEqual([]);
    });
  });

  describe('terminate', () => {
    it.each([
      ['WaitingForViewer', aSession()],
      ['Locked', aSession().locked()],
      ['PendingApproval', aSession().pendingApproval()],
      ['Active', aSession().active()],
    ])('ends a %s session when the host asks (15)', (_status, builder) => {
      const s = builder.build();

      s.terminate({ by: 'host', reason: 'done', now: T0 });

      expect(s.status).toBe('Terminated');
      expect(s.pendingJoin).toBeNull();
      expect(s.pullEvents()).toEqual([
        {
          type: 'SessionTerminated',
          sessionId: IDS.session.value,
          occurredAt: T0,
          by: 'host',
          reason: 'done',
        },
      ]);
    });

    it('lets the viewer end an active session (D3)', () => {
      const s = aSession().active().build();
      s.terminate({ by: 'viewer', now: T0 });
      expect(s.status).toBe('Terminated');
    });

    it('does not let a viewer end a session it is not part of', () => {
      const s = aSession().pendingApproval().build();
      expect(() => {
        s.terminate({ by: 'viewer', now: T0 });
      }).toThrow(NoViewer);
    });
  });

  describe('checkExpiry', () => {
    it('returns a pending join to waiting after 60 s without a decision (13, D2)', () => {
      const s = aSession().pendingApproval().build();

      s.checkExpiry(at(60 * SECOND));

      expect(s.status).toBe('WaitingForViewer');
      expect(s.pendingJoin).toBeNull();
      expect(s.pullEvents()).toEqual([
        {
          type: 'JoinRejected',
          sessionId: IDS.session.value,
          occurredAt: at(60 * SECOND),
          joinRequestId: IDS.joinRequest.value,
          reason: 'timeout',
        },
      ]);
    });

    it.each([
      ['WaitingForViewer', aSession()],
      ['Locked', aSession().locked()],
      ['PendingApproval', aSession().pendingApproval()],
    ])('expires a %s session after the waiting window (16)', (status, builder) => {
      const s = builder.build();

      s.checkExpiry(at(10 * MINUTE));

      expect(s.status).toBe('Expired');
      expect(s.pullEvents().at(-1)).toEqual({
        type: 'SessionExpired',
        sessionId: IDS.session.value,
        occurredAt: at(10 * MINUTE),
        previousStatus: status,
      });
    });

    it('expires an active session after 2 hours, not before (17, FR-09a)', () => {
      const s = aSession().active().build();

      s.checkExpiry(at(2 * HOUR - 1));
      expect(s.status).toBe('Active');

      s.checkExpiry(at(2 * HOUR));
      expect(s.status).toBe('Expired');
    });

    it('changes nothing when nothing is due', () => {
      const s = aSession().build();
      const before = s.version;
      s.checkExpiry(at(5 * MINUTE));
      expect(s.version).toBe(before);
      expect(s.pullEvents()).toEqual([]);
    });

    it('leaves closed sessions untouched', () => {
      const s = aSession().terminated().build();
      s.checkExpiry(at(3 * HOUR));
      expect(s.status).toBe('Terminated');
      expect(s.pullEvents()).toEqual([]);
    });
  });

  describe('closed sessions (18, I8)', () => {
    const commands = {
      requestJoin: (s: RemoteSession) => {
        const r = s.requestJoin(join(true));
        if (!r.ok) throw r.error;
      },
      approveJoin: (s: RemoteSession) => {
        s.approveJoin({
          joinRequestId: IDS.joinRequest,
          role: 'controller',
          viewerId: IDS.viewer,
          now: T0,
        });
      },
      rejectJoin: (s: RemoteSession) => {
        s.rejectJoin({ joinRequestId: IDS.joinRequest, now: T0 });
      },
      regenerateOtp: (s: RemoteSession) => {
        s.regenerateOtp({ otpHash: 'h', now: T0 });
      },
      changeRole: (s: RemoteSession) => {
        s.changeRole({ role: 'observer', now: T0 });
      },
      terminate: (s: RemoteSession) => {
        s.terminate({ by: 'host', now: T0 });
      },
    };

    it.each(
      Object.entries(commands).flatMap(([name, run]) => [
        { name, status: 'Terminated', builder: () => aSession().active().terminated(), run },
        { name, status: 'Expired', builder: () => aSession().expired(), run },
      ]),
    )('$name on a $status session → SessionClosed', ({ builder, run }) => {
      const s = builder().build();
      expect(() => {
        run(s);
      }).toThrow(SessionClosed);
    });
  });

  describe('transition table (02-domain-model §4.6)', () => {
    it.each([
      {
        command: 'requestJoin',
        status: 'PendingApproval',
        builder: () => aSession().pendingApproval(),
        error: JoinAlreadyPending,
      },
      {
        command: 'requestJoin',
        status: 'Active',
        builder: () => aSession().active(),
        error: SessionOccupied,
      },
      {
        command: 'approveJoin',
        status: 'WaitingForViewer',
        builder: () => aSession(),
        error: NoPendingJoin,
      },
      {
        command: 'approveJoin',
        status: 'Locked',
        builder: () => aSession().locked(),
        error: NoPendingJoin,
      },
      {
        command: 'approveJoin',
        status: 'Active',
        builder: () => aSession().active(),
        error: NoPendingJoin,
      },
      {
        command: 'rejectJoin',
        status: 'WaitingForViewer',
        builder: () => aSession(),
        error: NoPendingJoin,
      },
      {
        command: 'rejectJoin',
        status: 'Active',
        builder: () => aSession().active(),
        error: NoPendingJoin,
      },
      {
        command: 'regenerateOtp',
        status: 'PendingApproval',
        builder: () => aSession().pendingApproval(),
        error: JoinAlreadyPending,
      },
      {
        command: 'regenerateOtp',
        status: 'Active',
        builder: () => aSession().active(),
        error: SessionOccupied,
      },
      {
        command: 'changeRole',
        status: 'WaitingForViewer',
        builder: () => aSession(),
        error: NoViewer,
      },
      {
        command: 'changeRole',
        status: 'Locked',
        builder: () => aSession().locked(),
        error: NoViewer,
      },
      {
        command: 'changeRole',
        status: 'PendingApproval',
        builder: () => aSession().pendingApproval(),
        error: NoViewer,
      },
    ])('$command in $status → $error.name', ({ command, builder, error }) => {
      const s = builder().build();
      const run = (): void => {
        switch (command) {
          case 'requestJoin': {
            const r = s.requestJoin(join(true));
            if (!r.ok) throw r.error;
            return;
          }
          case 'approveJoin':
            s.approveJoin({
              joinRequestId: IDS.joinRequest,
              role: 'controller',
              viewerId: IDS.viewer,
              now: T0,
            });
            return;
          case 'rejectJoin':
            s.rejectJoin({ joinRequestId: IDS.joinRequest, now: T0 });
            return;
          case 'regenerateOtp':
            s.regenerateOtp({ otpHash: 'h', now: T0 });
            return;
          case 'changeRole':
            s.changeRole({ role: 'observer', now: T0 });
            return;
        }
      };
      expect(run).toThrow(error);
    });
  });

  describe('version and events', () => {
    it('increments the version on every successful change, including a counted wrong OTP (19)', () => {
      const s = aSession().build();
      expect(s.version).toBe(1);
      s.requestJoin(join(false));
      expect(s.version).toBe(2);
      s.requestJoin(join(true));
      expect(s.version).toBe(3);
      expect(() => {
        s.approveJoin({
          joinRequestId: IDS.otherJoinRequest,
          role: 'controller',
          viewerId: IDS.viewer,
          now: T0,
        });
      }).toThrow();
      expect(s.version).toBe(3);
    });

    it('returns events in order and then forgets them (20)', () => {
      const s = aSession().build();
      s.requestJoin(join(false));
      s.requestJoin(join(true));

      expect(s.pullEvents().map((e) => e.type)).toEqual(['JoinAttemptFailed', 'JoinRequested']);
      expect(s.pullEvents()).toEqual([]);
    });

    it('never puts the OTP hash in an event (I9)', () => {
      const s = RemoteSession.create({
        id: IDS.session,
        code: CODE,
        otpHash: 'secret-hash',
        now: T0,
      });
      s.regenerateOtp({ otpHash: 'secret-hash-2', now: T0 });
      expect(JSON.stringify(s.pullEvents())).not.toContain('secret-hash');
    });
  });

  describe('snapshot', () => {
    it('restores an equal aggregate from its snapshot without replaying events', () => {
      const s = aSession().active('observer').build();

      const restored = RemoteSession.restore(s.toSnapshot());

      expect(restored.toSnapshot()).toEqual(s.toSnapshot());
      expect(restored.pullEvents()).toEqual([]);
    });

    it('uses the default policy unless told otherwise', () => {
      const s = aSession().withPolicy({ waitingTtlMs: MINUTE }).build();
      expect(s.waitingExpiresAt).toEqual(at(MINUTE));
      expect(DEFAULT_SESSION_POLICY.maxActiveDurationMs).toBe(2 * HOUR);
    });
  });
});
