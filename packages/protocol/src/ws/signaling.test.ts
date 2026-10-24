import { describe, expect, it } from 'vitest';
import {
  MAX_SDP_LENGTH,
  MediaFallbackPayload,
  MediaModePayload,
  RtcIcePayload,
  RtcSdpPayload,
} from './signaling.js';

describe('signaling payloads', () => {
  it('accepts an SDP up to the size limit and rejects larger ones', () => {
    expect(RtcSdpPayload.safeParse({ sdp: 'v=0' }).success).toBe(true);
    expect(RtcSdpPayload.safeParse({ sdp: 'x'.repeat(MAX_SDP_LENGTH) }).success).toBe(true);
    expect(RtcSdpPayload.safeParse({ sdp: 'x'.repeat(MAX_SDP_LENGTH + 1) }).success).toBe(false);
  });

  it('accepts an ICE candidate or null for end-of-candidates', () => {
    expect(
      RtcIcePayload.safeParse({
        candidate: {
          candidate: 'candidate:1 1 udp 2122260223 10.0.0.2 54400 typ host',
          sdpMid: '0',
          sdpMLineIndex: 0,
        },
      }).success,
    ).toBe(true);
    expect(RtcIcePayload.safeParse({ candidate: null }).success).toBe(true);
    expect(RtcIcePayload.safeParse({}).success).toBe(false);
  });

  it('validates media fallback reasons and modes', () => {
    expect(MediaFallbackPayload.safeParse({ reason: 'ice_failed' }).success).toBe(true);
    expect(MediaFallbackPayload.safeParse({ reason: 'bored' }).success).toBe(false);
    expect(MediaModePayload.safeParse({ mode: 'relay' }).success).toBe(true);
  });
});
