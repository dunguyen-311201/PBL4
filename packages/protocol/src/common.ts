import { z } from 'zod';

export const Uuid = z.uuid();
export const IsoDateTime = z.iso.datetime({ offset: true });
export const Jwt = z.string().min(1);
