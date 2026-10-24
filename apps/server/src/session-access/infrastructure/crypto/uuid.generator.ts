import crypto from 'node:crypto';
import type { IdGenerator } from '../../application/ports/generators.js';

export class UuidGenerator implements IdGenerator {
  uuid(): string {
    return crypto.randomUUID();
  }
}
