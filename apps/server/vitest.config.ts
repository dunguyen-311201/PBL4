import { sharedVitestConfig } from '@pbl4/config/vitest';
import { defineConfig } from 'vitest/config';

// docs/06-test-strategy.md §7: domain ≥ 90% lines/branches.
export default defineConfig(
  sharedVitestConfig({ thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 } }),
);
