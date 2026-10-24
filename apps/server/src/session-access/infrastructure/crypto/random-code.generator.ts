import crypto from 'node:crypto';
import type { CodeGenerator } from '../../application/ports/generators.js';

const MIN_CODE = 100_000_000;
const MAX_CODE = 1_000_000_000;

export class RandomCodeGenerator implements CodeGenerator {
  next(): string {
    return crypto.randomInt(MIN_CODE, MAX_CODE).toString();
  }
}
