import { sharedVitestConfig } from '@pbl4/config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  sharedVitestConfig({ thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 } }),
);
