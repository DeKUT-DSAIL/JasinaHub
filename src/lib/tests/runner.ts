import { TestSuite, TestResult } from "./types";

export interface RunOptions {
  includeDestructive?: boolean;
  onResult?: (result: TestResult) => void;
  onTestStart?: (suiteId: string, testId: string) => void;
}

export async function runSuites(suites: TestSuite[], opts: RunOptions = {}): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const suite of suites) {
    for (const test of suite.tests) {
      if (test.destructive && !opts.includeDestructive) {
        const r: TestResult = {
          testId: test.id,
          suiteId: suite.id,
          name: test.name,
          status: "skipped",
          durationMs: 0,
          error: "Skipped (destructive test disabled)",
        };
        results.push(r);
        opts.onResult?.(r);
        continue;
      }
      opts.onTestStart?.(suite.id, test.id);
      const start = performance.now();
      try {
        const out = (await test.run()) as { details?: unknown } | void;
        const r: TestResult = {
          testId: test.id,
          suiteId: suite.id,
          name: test.name,
          status: "passed",
          durationMs: Math.round(performance.now() - start),
          details: out && typeof out === "object" ? out.details : undefined,
        };
        results.push(r);
        opts.onResult?.(r);
      } catch (err: any) {
        if (err?.skip) {
          const r: TestResult = {
            testId: test.id,
            suiteId: suite.id,
            name: test.name,
            status: "skipped",
            durationMs: Math.round(performance.now() - start),
            error: err?.message ?? "Skipped",
          };
          results.push(r);
          opts.onResult?.(r);
          continue;
        }
        const r: TestResult = {
          testId: test.id,
          suiteId: suite.id,
          name: test.name,
          status: "failed",
          durationMs: Math.round(performance.now() - start),
          error: err?.message ?? String(err),
          details: err?.stack,
        };
        results.push(r);
        opts.onResult?.(r);
      }
    }
  }
  return results;
}