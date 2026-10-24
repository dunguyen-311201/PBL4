import { z } from 'zod';
import { ErrorBody, type ErrorCode } from './errors.js';

/** Response to every client command sent with a Socket.IO acknowledgement callback. */
export type Ack<T> = { ok: true; data: T } | { ok: false; error: ErrorBody };

export const AckSchema = <T extends z.ZodType>(data: T) =>
  z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), data }),
    z.object({ ok: z.literal(false), error: ErrorBody }),
  ]);

export const ackOk = <T>(data: T): Ack<T> => ({ ok: true, data });

export const ackFail = (code: ErrorCode, message: string): Ack<never> => ({
  ok: false,
  error: { code, message },
});
