import { describe, expect, it } from 'vitest';
import {
  JoinApprovePayload,
  JoinRejectPayload,
  ParticipantRole,
  SessionTerminatePayload,
  ViewerRoleChangePayload,
} from './host-commands.js';

const jrId = 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f';

describe('host commands', () => {
  it('only knows controller and observer roles', () => {
    expect(ParticipantRole.options).toEqual(['controller', 'observer']);
  });

  it('validates join.approve', () => {
    expect(JoinApprovePayload.safeParse({ joinRequestId: jrId, role: 'controller' }).success).toBe(
      true,
    );
    expect(JoinApprovePayload.safeParse({ joinRequestId: jrId, role: 'admin' }).success).toBe(
      false,
    );
    expect(JoinApprovePayload.safeParse({ joinRequestId: 'x', role: 'observer' }).success).toBe(
      false,
    );
  });

  it('validates join.reject', () => {
    expect(JoinRejectPayload.safeParse({ joinRequestId: jrId }).success).toBe(true);
  });

  it('validates viewer.role.change', () => {
    expect(ViewerRoleChangePayload.safeParse({ role: 'observer' }).success).toBe(true);
  });

  it('limits the optional terminate reason', () => {
    expect(SessionTerminatePayload.safeParse({}).success).toBe(true);
    expect(SessionTerminatePayload.safeParse({ reason: 'done' }).success).toBe(true);
    expect(SessionTerminatePayload.safeParse({ reason: 'x'.repeat(201) }).success).toBe(false);
  });
});
