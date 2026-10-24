import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UuidGenerator } from './uuid.generator.js';

describe('UuidGenerator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates standard RFC 4122 v4 UUIDs', () => {
    // Arrange
    const generator = new UuidGenerator();
    const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // Act
    const id1 = generator.uuid();
    const id2 = generator.uuid();

    // Assert
    expect(id1).toMatch(uuidV4Pattern);
    expect(id2).toMatch(uuidV4Pattern);
    expect(id1).not.toBe(id2);
  });

  it('delegates to crypto.randomUUID', () => {
    // Arrange
    const generator = new UuidGenerator();
    const randomUuidSpy = vi.spyOn(crypto, 'randomUUID');

    // Act
    const id = generator.uuid();

    // Assert
    expect(randomUuidSpy).toHaveBeenCalledOnce();
    expect(id).toBeDefined();
  });
});
