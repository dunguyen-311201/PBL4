import { z } from 'zod';

/** A relay JPEG must stay below the 1 MB Socket.IO buffer limit with room for metadata. */
export const MAX_RELAY_FRAME_BYTES = 900 * 1024;

/** Sent alongside the binary JPEG attachment of `relay.frame`. */
export const RelayFrameMeta = z.object({
  seq: z.number().int().nonnegative(),
  width: z.number().int().positive().max(7680),
  height: z.number().int().positive().max(4320),
  ts: z.number().int().nonnegative(),
});
export type RelayFrameMeta = z.infer<typeof RelayFrameMeta>;

export const RelayFrameAck = z.object({ seq: z.number().int().nonnegative() });
export type RelayFrameAck = z.infer<typeof RelayFrameAck>;
