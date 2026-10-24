import { defineConfig } from 'vitest/config';

// Integration tests talk to a real Redis (REDIS_URL or Testcontainers). Not part of
// `pnpm test`; run with `pnpm test:integration` (docs/06-test-strategy.md §2).
export default defineConfig({
  test: {
    include: ['test/integration/**/*.int.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
