import { describe, expect, it } from 'vitest';
import { MAX_RELAY_FRAME_BYTES, RelayFrameAck, RelayFrameMeta } from './relay.js';

describe('relay payloads', () => {
  it('validates frame metadata', () => {
    expect(
      RelayFrameMeta.safeParse({ seq: 1, width: 1280, height: 720, ts: 1729740000000 }).success,
    ).toBe(true);
    expect(RelayFrameMeta.safeParse({ seq: -1, width: 1280, height: 720, ts: 0 }).success).toBe(
      false,
    );
    expect(RelayFrameMeta.safeParse({ seq: 1, width: 0, height: 720, ts: 0 }).success).toBe(false);
    expect(RelayFrameMeta.safeParse({ seq: 1.5, width: 1280, height: 720, ts: 0 }).success).toBe(
      false,
    );
  });

  it('validates frame acks', () => {
    expect(RelayFrameAck.safeParse({ seq: 7 }).success).toBe(true);
  });

  it('keeps relay frames under the 1 MB transport limit', () => {
    expect(MAX_RELAY_FRAME_BYTES).toBeLessThan(1_000_000);
  });
});
