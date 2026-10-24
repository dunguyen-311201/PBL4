import { describe, expect, it } from 'vitest';
import { HandshakeAuth, PROTOCOL_VERSION } from './version.js';

describe('handshake', () => {
  it('is protocol version 1', () => {
    expect(PROTOCOL_VERSION).toBe('1');
  });

  it('requires a token and the current protocol version', () => {
    expect(HandshakeAuth.safeParse({ token: 'eyJ.x.y', protocolVersion: '1' }).success).toBe(true);
    expect(HandshakeAuth.safeParse({ token: 'eyJ.x.y', protocolVersion: '2' }).success).toBe(false);
    expect(HandshakeAuth.safeParse({ protocolVersion: '1' }).success).toBe(false);
  });
});
