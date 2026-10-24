import type { z } from 'zod';
import { InputEvent } from '../input.js';
import {
  EmptyPayload,
  JoinApprovePayload,
  JoinRejectPayload,
  SessionTerminatePayload,
  ViewerRoleChangePayload,
} from './host-commands.js';
import { RelayFrameAck, RelayFrameMeta } from './relay.js';
import {
  EmptyEvent,
  JoinApprovedEvent,
  JoinRejectedEvent,
  JoinRequestedEvent,
  SessionExpiringEvent,
  SessionLockedEvent,
  SessionTerminatedEvent,
  ViewerPresenceEvent,
  ViewerRoleChangedEvent,
} from './server-events.js';
import {
  MediaFallbackPayload,
  MediaModePayload,
  RtcIcePayload,
  RtcSdpPayload,
} from './signaling.js';

/** Socket.IO namespace for everything session-related. */
export const SESSION_NAMESPACE = '/session' as const;

export type Actor = 'host' | 'viewer';

interface CommandSpec {
  readonly schema: z.ZodType;
  /** Principals allowed to send the command; enforced by the server's ActorGuard. */
  readonly actors: readonly Actor[];
}

const spec = <S extends z.ZodType>(schema: S, actors: readonly Actor[]) =>
  ({ schema, actors }) satisfies CommandSpec;

/** Client → server events (04-protocol §4.2–4.6). */
export const CLIENT_COMMANDS = {
  'session.otp.regenerate': spec(EmptyPayload, ['host']),
  'join.approve': spec(JoinApprovePayload, ['host']),
  'join.reject': spec(JoinRejectPayload, ['host']),
  'viewer.role.change': spec(ViewerRoleChangePayload, ['host']),
  'session.terminate': spec(SessionTerminatePayload, ['host', 'viewer']),
  'rtc.offer': spec(RtcSdpPayload, ['host']),
  'rtc.answer': spec(RtcSdpPayload, ['viewer']),
  'rtc.ice': spec(RtcIcePayload, ['host', 'viewer']),
  'media.fallback': spec(MediaFallbackPayload, ['viewer']),
  'media.mode': spec(MediaModePayload, ['host']),
  'relay.frame': spec(RelayFrameMeta, ['host']),
  'relay.frame.ack': spec(RelayFrameAck, ['viewer']),
  'relay.input': spec(InputEvent, ['viewer']),
} as const;

export type ClientCommandName = keyof typeof CLIENT_COMMANDS;

/** Server → client events (04-protocol §4.4). Forwarded signaling/relay events reuse the payloads above. */
export const SERVER_EVENTS = {
  'join.requested': JoinRequestedEvent,
  'join.approved': JoinApprovedEvent,
  'join.rejected': JoinRejectedEvent,
  'session.locked': SessionLockedEvent,
  'viewer.connected': ViewerPresenceEvent,
  'viewer.disconnected': ViewerPresenceEvent,
  'viewer.role.changed': ViewerRoleChangedEvent,
  'session.expiring': SessionExpiringEvent,
  'session.terminated': SessionTerminatedEvent,
  'session.expired': EmptyEvent,
  'session.replaced': EmptyEvent,
  'rtc.offer': RtcSdpPayload,
  'rtc.answer': RtcSdpPayload,
  'rtc.ice': RtcIcePayload,
  'media.fallback': MediaFallbackPayload,
  'media.mode': MediaModePayload,
  'relay.frame': RelayFrameMeta,
  'relay.frame.ack': RelayFrameAck,
  'relay.input': InputEvent,
} as const;

export type ServerEventName = keyof typeof SERVER_EVENTS;
export type ServerEventPayload<N extends ServerEventName> = z.infer<(typeof SERVER_EVENTS)[N]>;
export type ClientCommandPayload<N extends ClientCommandName> = z.infer<
  (typeof CLIENT_COMMANDS)[N]['schema']
>;
