// Shared Vitest defaults. Each package spreads this and sets its own coverage thresholds
// (docs/06-test-strategy.md §7).

/** @param {{ thresholds?: { lines: number; branches: number; functions?: number; statements?: number }; coverageExclude?: string[] }} [options] */
export function sharedVitestConfig(options = {}) {
  return {
    test: {
      include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
      // *.int.test.ts need real infrastructure and run via `test:integration`.
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.int.test.ts'],
      passWithNoTests: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts', 'src/**/index.ts', ...(options.coverageExclude ?? [])],
        reporter: ['text', 'html', 'lcov'],
        ...(options.thresholds ? { thresholds: options.thresholds } : {}),
      },
    },
  };
}
