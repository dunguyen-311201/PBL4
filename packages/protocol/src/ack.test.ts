import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ackFail, ackOk, AckSchema } from './ack.js';

describe('Ack', () => {
  const schema = AckSchema(z.object({ role: z.enum(['controller', 'observer']) }));

  it('builds and validates a success ack', () => {
    const ack = ackOk({ role: 'observer' as const });
    expect(ack).toEqual({ ok: true, data: { role: 'observer' } });
    expect(schema.safeParse(ack).success).toBe(true);
  });

  it('builds and validates a failure ack', () => {
    const ack = ackFail('NO_VIEWER', 'no viewer');
    expect(ack).toEqual({ ok: false, error: { code: 'NO_VIEWER', message: 'no viewer' } });
    expect(schema.safeParse(ack).success).toBe(true);
  });

  it('rejects a success ack whose data does not match', () => {
    expect(schema.safeParse({ ok: true, data: { role: 'admin' } }).success).toBe(false);
  });
});
