import { describe, expect, it } from 'vitest';
import { ERROR_CODES, ErrorCode, ErrorBody, HTTP_STATUS_BY_ERROR_CODE } from './errors.js';

describe('error codes', () => {
  it('lists every code from docs/04-protocol.md §7', () => {
    expect([...ERROR_CODES].sort()).toEqual(
      [
        'INVALID_INPUT',
        'INVALID_CREDENTIALS',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'RATE_LIMITED',
        'NO_PENDING_JOIN',
        'JOIN_REQUEST_EXPIRED',
        'JOIN_ALREADY_PENDING',
        'SESSION_OCCUPIED',
        'NO_VIEWER',
        'SESSION_NOT_ACTIVE',
        'SESSION_CLOSED',
        'CONFLICT',
        'PAYLOAD_TOO_LARGE',
        'PROTOCOL_VERSION_UNSUPPORTED',
        'CODE_SPACE_EXHAUSTED',
        'INTERNAL',
      ].sort(),
    );
  });

  it('maps every code to an HTTP status', () => {
    for (const code of ERROR_CODES) {
      expect(HTTP_STATUS_BY_ERROR_CODE[code]).toBeTypeOf('number');
    }
  });

  it('uses a single 401 for every failed join so callers cannot tell why (ADR-004)', () => {
    expect(HTTP_STATUS_BY_ERROR_CODE.INVALID_CREDENTIALS).toBe(401);
  });

  it('rejects an unknown code', () => {
    expect(ErrorCode.safeParse('SOMETHING_ELSE').success).toBe(false);
  });

  it('validates an error body', () => {
    expect(ErrorBody.safeParse({ code: 'SESSION_CLOSED', message: 'closed' }).success).toBe(true);
    expect(ErrorBody.safeParse({ code: 'SESSION_CLOSED' }).success).toBe(false);
  });
});
