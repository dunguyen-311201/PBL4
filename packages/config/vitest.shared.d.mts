export interface CoverageThresholds {
  lines: number;
  branches: number;
  functions?: number;
  statements?: number;
}

export function sharedVitestConfig(options?: {
  thresholds?: CoverageThresholds;
  /** Extra globs left out of unit coverage, e.g. adapters covered by integration tests. */
  coverageExclude?: string[];
}): {
  test: Record<string, unknown>;
};
