import { z } from 'zod';
import { IsoDateTime, Jwt, Uuid } from '../common.js';

/** 9 digits, never starting with 0 so it reads well over the phone. */
export const SESSION_CODE_PATTERN = /^[1-9][0-9]{8}$/;
/** 6 digits (decision Q1). */
export const OTP_PATTERN = /^[0-9]{6}$/;

export const SessionCode = z.string().regex(SESSION_CODE_PATTERN);
export const Otp = z.string().regex(OTP_PATTERN);

/** POST /v1/sessions → 201 */
export const CreateSessionResponse = z.object({
  sessionId: Uuid,
  code: SessionCode,
  otp: Otp,
  otpExpiresAt: IsoDateTime,
  waitingExpiresAt: IsoDateTime,
  hostToken: Jwt,
});
export type CreateSessionResponse = z.infer<typeof CreateSessionResponse>;

/** POST /v1/sessions/join — body. Unknown fields are stripped. */
export const JoinRequestBody = z.object({
  code: SessionCode,
  otp: Otp,
});
export type JoinRequestBody = z.infer<typeof JoinRequestBody>;

/** POST /v1/sessions/join → 202 */
export const JoinAcceptedResponse = z.object({
  joinRequestId: Uuid,
  pendingToken: Jwt,
  decisionDeadline: IsoDateTime,
});
export type JoinAcceptedResponse = z.infer<typeof JoinAcceptedResponse>;
