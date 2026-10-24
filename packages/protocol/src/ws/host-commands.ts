import { z } from 'zod';
import { Uuid } from '../common.js';

export const ParticipantRole = z.enum(['controller', 'observer']);
export type ParticipantRole = z.infer<typeof ParticipantRole>;

export const EmptyPayload = z.object({});

export const JoinApprovePayload = z.object({ joinRequestId: Uuid, role: ParticipantRole });
export type JoinApprovePayload = z.infer<typeof JoinApprovePayload>;

export const JoinRejectPayload = z.object({ joinRequestId: Uuid });
export type JoinRejectPayload = z.infer<typeof JoinRejectPayload>;

export const ViewerRoleChangePayload = z.object({ role: ParticipantRole });
export type ViewerRoleChangePayload = z.infer<typeof ViewerRoleChangePayload>;

/** Sent by Host or Viewer. */
export const SessionTerminatePayload = z.object({ reason: z.string().max(200).optional() });
export type SessionTerminatePayload = z.infer<typeof SessionTerminatePayload>;
