import crypto from 'node:crypto';
import type { OtpGenerator } from '../../application/ports/generators.js';

const MIN_OTP = 0;
const MAX_OTP = 1_000_000;
const OTP_LENGTH = 6;

export class RandomOtpGenerator implements OtpGenerator {
  next(): string {
    return crypto.randomInt(MIN_OTP, MAX_OTP).toString().padStart(OTP_LENGTH, '0');
  }
}
