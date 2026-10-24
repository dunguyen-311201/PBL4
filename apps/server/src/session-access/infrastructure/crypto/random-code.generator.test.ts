import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionCode } from '../../domain/value-objects/session-code.js';
import { RandomCodeGenerator } from './random-code.generator.js';

describe('RandomCodeGenerator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates 9-digit codes starting with 1-9 accepted by SessionCode.of() over 10 000 iterations', () => {
    // Arrange
    const generator = new RandomCodeGenerator();
    const pattern = /^[1-9][0-9]{8}$/;

    // Act & Assert
    for (let i = 0; i < 10_000; i++) {
      const code = generator.next();
      expect(code).toMatch(pattern);
      expect(() => SessionCode.of(code)).not.toThrow();
    }
  });

  it('uses crypto.randomInt and does not use Math.random', () => {
    // Arrange
    const generator = new RandomCodeGenerator();
    const mathRandomSpy = vi.spyOn(Math, 'random');
    const randomIntSpy = vi.spyOn(crypto, 'randomInt');

    // Act
    const code = generator.next();

    // Assert
    expect(code).toMatch(/^[1-9][0-9]{8}$/);
    expect(mathRandomSpy).not.toHaveBeenCalled();
    expect(randomIntSpy).toHaveBeenCalledWith(100_000_000, 1_000_000_000);
  });
});
