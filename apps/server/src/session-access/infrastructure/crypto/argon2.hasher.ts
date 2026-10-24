import argon2 from 'argon2';
import type { SecretHasher } from '../../application/ports/secret-hasher.js';

export interface Argon2Options {
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
}

/**
 * OWASP minimum recommendations for Argon2id (RFC 9106):
 * - memoryCost: 19456 KiB (19 MiB)
 * - timeCost (iterations): 2
 * - parallelism: 1
 */
export const DEFAULT_ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const satisfies Required<Argon2Options>;

export class Argon2Hasher implements SecretHasher {
  readonly options: Required<Argon2Options>;

  constructor(options?: Argon2Options) {
    this.options = {
      memoryCost: options?.memoryCost ?? DEFAULT_ARGON2_OPTIONS.memoryCost,
      timeCost: options?.timeCost ?? DEFAULT_ARGON2_OPTIONS.timeCost,
      parallelism: options?.parallelism ?? DEFAULT_ARGON2_OPTIONS.parallelism,
    };
  }

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: this.options.memoryCost,
      timeCost: this.options.timeCost,
      parallelism: this.options.parallelism,
    });
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
