import { z } from 'zod';

/** Stable error codes. See docs/04-protocol.md §7. */
export const ERROR_CODES = [
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
] as const;

export const ErrorCode = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorBody = z.object({
  code: ErrorCode,
  message: z.string(),
});
export type ErrorBody = z.infer<typeof ErrorBody>;

/**
 * HTTP status per code. Every failed join maps to the same 401 INVALID_CREDENTIALS so that
 * callers cannot distinguish "unknown code" from "wrong OTP" or "locked session" (ADR-004).
 * PROTOCOL_VERSION_UNSUPPORTED only occurs on the WebSocket handshake; 400 is used if it ever
 * surfaces over HTTP.
 */
export const HTTP_STATUS_BY_ERROR_CODE: Readonly<Record<ErrorCode, number>> = {
  INVALID_INPUT: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  NO_PENDING_JOIN: 409,
  JOIN_REQUEST_EXPIRED: 409,
  JOIN_ALREADY_PENDING: 409,
  SESSION_OCCUPIED: 409,
  NO_VIEWER: 409,
  SESSION_NOT_ACTIVE: 409,
  SESSION_CLOSED: 410,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  PROTOCOL_VERSION_UNSUPPORTED: 400,
  CODE_SPACE_EXHAUSTED: 503,
  INTERNAL: 500,
};
