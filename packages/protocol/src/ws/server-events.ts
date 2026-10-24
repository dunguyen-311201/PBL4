import { z } from 'zod';
import { IsoDateTime, Jwt, Uuid } from '../common.js';
import { ParticipantRole } from './host-commands.js';

const IceServer = z.object({
  urls: z.union([z.string(), z.array(z.string()).min(1)]),
  username: z.string().optional(),
  credential: z.string().optional(),
});

export const JoinRequestedEvent = z.object({
  joinRequestId: Uuid,
  viewerIp: z.string(),
  decisionDeadline: IsoDateTime,
});

export const JoinApprovedEvent = z.object({
  viewerToken: Jwt,
  viewerId: Uuid,
  role: ParticipantRole,
  activeExpiresAt: IsoDateTime,
  iceServers: z.array(IceServer),
});

export const JoinRejectedEvent = z.object({ reason: z.enum(['rejected', 'timeout']) });
export const SessionLockedEvent = z.object({ failedAttempts: z.number().int().positive() });
export const ViewerPresenceEvent = z.object({ viewerId: Uuid });
export const ViewerRoleChangedEvent = z.object({ role: ParticipantRole });
export const SessionExpiringEvent = z.object({ expiresAt: IsoDateTime });
export const SessionTerminatedEvent = z.object({
  by: z.enum(['host', 'viewer']),
  reason: z.string().max(200).optional(),
});
export const EmptyEvent = z.object({});

export type JoinRequestedEvent = z.infer<typeof JoinRequestedEvent>;
export type JoinApprovedEvent = z.infer<typeof JoinApprovedEvent>;
export type JoinRejectedEvent = z.infer<typeof JoinRejectedEvent>;
export type SessionLockedEvent = z.infer<typeof SessionLockedEvent>;
export type ViewerPresenceEvent = z.infer<typeof ViewerPresenceEvent>;
export type ViewerRoleChangedEvent = z.infer<typeof ViewerRoleChangedEvent>;
export type SessionExpiringEvent = z.infer<typeof SessionExpiringEvent>;
export type SessionTerminatedEvent = z.infer<typeof SessionTerminatedEvent>;
