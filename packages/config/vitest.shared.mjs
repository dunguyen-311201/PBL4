// Shared Vitest defaults. Each package spreads this and sets its own coverage thresholds
// (docs/06-test-strategy.md §7).

/** @param {{ thresholds?: { lines: number; branches: number; functions?: number; statements?: number } }} [options] */
export function sharedVitestConfig(options = {}) {
  return {
    test: {
      include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
      passWithNoTests: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
        reporter: ['text', 'html', 'lcov'],
        ...(options.thresholds ? { thresholds: options.thresholds } : {}),
      },
    },
  };
}
