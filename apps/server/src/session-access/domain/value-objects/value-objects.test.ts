import { describe, expect, it } from 'vitest';
import { InvalidIdentifier, InvalidSessionCode, InvalidOtpHash } from '../errors.js';
import { JoinRequestId, SessionId, ViewerId } from './identifiers.js';
import { OtpHash } from './otp-hash.js';
import { SessionCode } from './session-code.js';

const UUID = '5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b';

describe('identifiers', () => {
  it.each([
    ['SessionId', SessionId],
    ['JoinRequestId', JoinRequestId],
    ['ViewerId', ViewerId],
  ] as const)('%s accepts a UUID v4 and rejects anything else', (_name, Id) => {
    expect(Id.of(UUID).value).toBe(UUID);
    expect(() => Id.of('42')).toThrow(InvalidIdentifier);
    expect(() => Id.of('5b0c1a54-7f1e-1b8e-9f2a-1d3c4e5f6a7b')).toThrow(InvalidIdentifier); // v1
  });

  it('compares by value', () => {
    expect(SessionId.of(UUID).equals(SessionId.of(UUID))).toBe(true);
  });
});

describe('SessionCode', () => {
  it('accepts 9 digits not starting with 0', () => {
    expect(SessionCode.of('482915307').value).toBe('482915307');
  });

  it.each(['48291530', '4829153071', '082915307', '48291530a', ''])('rejects "%s"', (raw) => {
    expect(() => SessionCode.of(raw)).toThrow(InvalidSessionCode);
  });
});

describe('OtpHash', () => {
  const now = new Date('2026-10-24T10:00:00Z');
  const expiresAt = new Date('2026-10-24T10:10:00Z');

  it('stores only the hash, never the plain OTP (I9)', () => {
    const otp = OtpHash.issue('$argon2id$v=19$abc', expiresAt);
    expect(otp.hash).toBe('$argon2id$v=19$abc');
    expect(otp.consumed).toBe(false);
  });

  it('rejects an empty hash', () => {
    expect(() => OtpHash.issue('', expiresAt)).toThrow(InvalidOtpHash);
  });

  it('expires at its expiry time', () => {
    const otp = OtpHash.issue('h', expiresAt);
    expect(otp.isExpired(now)).toBe(false);
    expect(otp.isExpired(expiresAt)).toBe(true);
  });

  it('is immutable: consuming returns a new value', () => {
    const otp = OtpHash.issue('h', expiresAt);
    const used = otp.consume();
    expect(used.consumed).toBe(true);
    expect(otp.consumed).toBe(false);
  });
});
