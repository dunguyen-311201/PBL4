import { describe, expect, it } from 'vitest';
import { Argon2Hasher, DEFAULT_ARGON2_OPTIONS } from './argon2.hasher.js';

describe('Argon2Hasher', () => {
  // Use minimal cost parameters so test execution remains fast (< 100ms)
  const fastHasher = new Argon2Hasher({
    memoryCost: 1024,
    timeCost: 1,
    parallelism: 1,
  });

  it('exposes default options matching OWASP recommendations', () => {
    // Assert OWASP recommended parameters
    expect(DEFAULT_ARGON2_OPTIONS).toEqual({
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const defaultHasher = new Argon2Hasher();
    expect(defaultHasher.options).toEqual(DEFAULT_ARGON2_OPTIONS);
  });

  it('hashes plain text using argon2id with a unique salt each time', async () => {
    // Arrange
    const plain = '123456';

    // Act
    const hash1 = await fastHasher.hash(plain);
    const hash2 = await fastHasher.hash(plain);

    // Assert
    expect(hash1).toMatch(/^\$argon2id\$/);
    expect(hash2).toMatch(/^\$argon2id\$/);
    expect(hash1).not.toBe(hash2);
  });

  it('returns true when verifying matching plain text and hash', async () => {
    // Arrange
    const plain = '654321';
    const hash = await fastHasher.hash(plain);

    // Act
    const result = await fastHasher.verify(plain, hash);

    // Assert
    expect(result).toBe(true);
  });

  it('returns false when verifying mismatched plain text', async () => {
    // Arrange
    const plain = '654321';
    const wrongPlain = '000000';
    const hash = await fastHasher.hash(plain);

    // Act
    const result = await fastHasher.verify(wrongPlain, hash);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false without throwing when hash is malformed or invalid', async () => {
    // Arrange
    const plain = '123456';
    const invalidHashes = ['not-a-hash', '', '$argon2id$malformed', 'invalid$format$string'];

    // Act & Assert
    for (const invalidHash of invalidHashes) {
      await expect(fastHasher.verify(plain, invalidHash)).resolves.toBe(false);
    }
  });
});
