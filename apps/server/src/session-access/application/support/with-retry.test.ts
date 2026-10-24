import { describe, expect, it, vi } from 'vitest';
import { ConcurrencyConflict, Forbidden } from '../errors.js';
import { withRetry } from './with-retry.js';

describe('withRetry', () => {
  it('returns the first result when there is no conflict', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('reloads and retries once after a concurrency conflict', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new ConcurrencyConflict('x')).mockResolvedValue('ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('gives up after the second conflict', async () => {
    const fn = vi.fn().mockRejectedValue(new ConcurrencyConflict('x'));
    await expect(withRetry(fn)).rejects.toBeInstanceOf(ConcurrencyConflict);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('never retries other errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Forbidden('no'));
    await expect(withRetry(fn)).rejects.toBeInstanceOf(Forbidden);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
