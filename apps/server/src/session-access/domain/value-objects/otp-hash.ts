import { InvalidOtpHash } from '../errors.js';

/**
 * The stored form of a one-time password: its hash, expiry and whether it has been used.
 * The plain OTP never enters the domain (I9); the application layer hashes it and verifies
 * guesses in constant time, then tells the aggregate whether they matched.
 */
export class OtpHash {
  private constructor(
    readonly hash: string,
    readonly expiresAt: Date,
    readonly consumed: boolean,
  ) {}

  static issue(hash: string, expiresAt: Date): OtpHash {
    if (hash.length === 0) throw new InvalidOtpHash('OTP hash must not be empty');
    return new OtpHash(hash, expiresAt, false);
  }

  static restore(hash: string, expiresAt: Date, consumed: boolean): OtpHash {
    return new OtpHash(hash, expiresAt, consumed);
  }

  isExpired(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }

  consume(): OtpHash {
    return new OtpHash(this.hash, this.expiresAt, true);
  }
}
