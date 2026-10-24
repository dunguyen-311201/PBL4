export interface CoverageThresholds {
  lines: number;
  branches: number;
  functions?: number;
  statements?: number;
}

export function sharedVitestConfig(options?: { thresholds?: CoverageThresholds }): {
  test: Record<string, unknown>;
};
