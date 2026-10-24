import { describe, expect, it } from 'vitest';
import {
  CreateSessionResponse,
  JoinAcceptedResponse,
  JoinRequestBody,
  SESSION_CODE_PATTERN,
  OTP_PATTERN,
} from './sessions.js';

describe('JoinRequestBody', () => {
  it('accepts a 9-digit session code and a 6-digit OTP', () => {
    expect(JoinRequestBody.safeParse({ code: '482915307', otp: '093184' }).success).toBe(true);
  });

  it.each([
    ['code too short', { code: '48291530', otp: '093184' }],
    ['code too long', { code: '4829153071', otp: '093184' }],
    ['code starts with 0', { code: '082915307', otp: '093184' }],
    ['code has letters', { code: '48291530a', otp: '093184' }],
    ['OTP too short', { code: '482915307', otp: '09318' }],
    ['OTP has letters (Q1: digits only)', { code: '482915307', otp: '09318a' }],
    ['missing OTP', { code: '482915307' }],
    ['code as number', { code: 482915307, otp: '093184' }],
  ])('rejects %s', (_label, body) => {
    expect(JoinRequestBody.safeParse(body).success).toBe(false);
  });

  it('strips unknown fields so they never reach the use case', () => {
    const parsed = JoinRequestBody.parse({ code: '482915307', otp: '093184', admin: true });
    expect(parsed).toEqual({ code: '482915307', otp: '093184' });
  });

  it('exposes the patterns used for validation', () => {
    expect(SESSION_CODE_PATTERN.test('123456789')).toBe(true);
    expect(OTP_PATTERN.test('000000')).toBe(true);
  });
});

describe('CreateSessionResponse', () => {
  const valid = {
    sessionId: '5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b',
    code: '482915307',
    otp: '093184',
    otpExpiresAt: '2026-10-24T03:10:00.000Z',
    waitingExpiresAt: '2026-10-24T03:10:00.000Z',
    hostToken: 'eyJhbGciOiJIUzI1NiJ9.e30.sig',
  };

  it('accepts a well-formed response', () => {
    expect(CreateSessionResponse.safeParse(valid).success).toBe(true);
  });

  it('rejects a non-ISO timestamp', () => {
    expect(CreateSessionResponse.safeParse({ ...valid, otpExpiresAt: 'tomorrow' }).success).toBe(
      false,
    );
  });

  it('rejects a non-UUID session id', () => {
    expect(CreateSessionResponse.safeParse({ ...valid, sessionId: '42' }).success).toBe(false);
  });
});

describe('JoinAcceptedResponse', () => {
  it('accepts a pending join with its deadline', () => {
    expect(
      JoinAcceptedResponse.safeParse({
        joinRequestId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
        pendingToken: 'eyJ.x.y',
        decisionDeadline: '2026-10-24T03:01:00.000Z',
      }).success,
    ).toBe(true);
  });
});
