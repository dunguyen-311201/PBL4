import { InvalidSessionCode } from '../errors.js';

/** 9 digits, never starting with 0 so it reads well over the phone (FR-01). */
const PATTERN = /^[1-9][0-9]{8}$/;

export class SessionCode {
  private constructor(readonly value: string) {}

  static of(value: string): SessionCode {
    if (!PATTERN.test(value))
      throw new InvalidSessionCode('Session code must be 9 digits not starting with 0');
    return new SessionCode(value);
  }
}
