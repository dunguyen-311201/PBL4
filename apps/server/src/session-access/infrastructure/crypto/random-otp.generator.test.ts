import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RandomOtpGenerator } from './random-otp.generator.js';

describe('RandomOtpGenerator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates 6-digit OTPs matching /^[0-9]{6}$/ over 10 000 iterations', () => {
    // Arrange
    const generator = new RandomOtpGenerator();
    const pattern = /^[0-9]{6}$/;

    // Act & Assert
    for (let i = 0; i < 10_000; i++) {
      const otp = generator.next();
      expect(otp).toMatch(pattern);
    }
  });

  it('preserves leading zeros when randomInt returns a small number', () => {
    // Arrange
    const generator = new RandomOtpGenerator();
    const randomIntSpy = vi.spyOn(crypto, 'randomInt');

    // Act & Assert: small number 123 -> "000123"
    randomIntSpy.mockImplementation(() => 123);
    expect(generator.next()).toBe('000123');

    // Act & Assert: zero -> "000000"
    randomIntSpy.mockImplementation(() => 0);
    expect(generator.next()).toBe('000000');

    // Act & Assert: max number 999999 -> "999999"
    randomIntSpy.mockImplementation(() => 999_999);
    expect(generator.next()).toBe('999999');
  });

  it('uses crypto.randomInt and does not use Math.random', () => {
    // Arrange
    const generator = new RandomOtpGenerator();
    const mathRandomSpy = vi.spyOn(Math, 'random');
    const randomIntSpy = vi.spyOn(crypto, 'randomInt');

    // Act
    const otp = generator.next();

    // Assert
    expect(otp).toMatch(/^[0-9]{6}$/);
    expect(mathRandomSpy).not.toHaveBeenCalled();
    expect(randomIntSpy).toHaveBeenCalledWith(0, 1_000_000);
  });
});
