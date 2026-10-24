import { z } from 'zod';

/** Bumped on any breaking change to the wire contract. Sent in the WebSocket handshake. */
export const PROTOCOL_VERSION = '1' as const;

export const HandshakeAuth = z.object({
  token: z.string().min(1),
  protocolVersion: z.literal(PROTOCOL_VERSION),
});
export type HandshakeAuth = z.infer<typeof HandshakeAuth>;
