import { describe, expect, it } from 'vitest';
import { SystemClock } from './system-clock.js';

describe('SystemClock', () => {
  it('returns the current date and time', () => {
    // Arrange
    const clock = new SystemClock();
    const before = Date.now();

    // Act
    const now = clock.now();

    // Assert
    const after = Date.now();
    expect(now).toBeInstanceOf(Date);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(after);
  });
});
