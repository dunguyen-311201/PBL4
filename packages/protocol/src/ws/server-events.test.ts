import { describe, expect, it } from 'vitest';
import {
  JoinApprovedEvent,
  JoinRejectedEvent,
  JoinRequestedEvent,
  SessionTerminatedEvent,
} from './server-events.js';

describe('server events', () => {
  it('validates join.requested', () => {
    expect(
      JoinRequestedEvent.safeParse({
        joinRequestId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
        viewerIp: '203.0.113.7',
        decisionDeadline: '2026-10-24T03:01:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('validates join.approved with ICE servers', () => {
    expect(
      JoinApprovedEvent.safeParse({
        viewerToken: 'eyJ.x.y',
        viewerId: '0f9e8d7c-6b5a-4c3d-9e1f-2a3b4c5d6e7f',
        role: 'controller',
        activeExpiresAt: '2026-10-24T05:00:00.000Z',
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: ['turn:turn.example.com:3478?transport=udp'], username: 'u', credential: 'c' },
        ],
      }).success,
    ).toBe(true);
  });

  it('only allows the documented rejection reasons', () => {
    expect(JoinRejectedEvent.safeParse({ reason: 'timeout' }).success).toBe(true);
    expect(JoinRejectedEvent.safeParse({ reason: 'locked' }).success).toBe(false);
  });

  it('records who terminated the session', () => {
    expect(SessionTerminatedEvent.safeParse({ by: 'viewer' }).success).toBe(true);
    expect(SessionTerminatedEvent.safeParse({ by: 'server' }).success).toBe(false);
  });
});
