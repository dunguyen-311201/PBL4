import { z } from 'zod';

/** The server only forwards SDP; it never parses it. */
export const MAX_SDP_LENGTH = 64 * 1024;

export const RtcSdpPayload = z.object({ sdp: z.string().min(1).max(MAX_SDP_LENGTH) });
export type RtcSdpPayload = z.infer<typeof RtcSdpPayload>;

const IceCandidateInit = z.object({
  candidate: z.string().max(1024),
  sdpMid: z.string().max(64).nullable().optional(),
  sdpMLineIndex: z.number().int().min(0).nullable().optional(),
  usernameFragment: z.string().max(256).nullable().optional(),
});

/** `candidate: null` signals end-of-candidates. */
export const RtcIcePayload = z.object({ candidate: IceCandidateInit.nullable() });
export type RtcIcePayload = z.infer<typeof RtcIcePayload>;

export const MediaFallbackPayload = z.object({
  reason: z.enum(['ice_failed', 'timeout', 'manual']),
});
export type MediaFallbackPayload = z.infer<typeof MediaFallbackPayload>;

export const MediaModePayload = z.object({ mode: z.enum(['webrtc', 'relay']) });
export type MediaModePayload = z.infer<typeof MediaModePayload>;
