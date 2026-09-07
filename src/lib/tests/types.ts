export type TestStatus = "pending" | "running" | "passed" | "failed" | "skipped";

export interface TestCase {
  id: string;
  name: string;
  destructive?: boolean;
  run: () => Promise<void | { details?: unknown }>;
}

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  tests: TestCase[];
}

export interface TestResult {
  testId: string;
  suiteId: string;
  name: string;
  status: TestStatus;
  durationMs: number;
  error?: string;
  details?: unknown;
}

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new AssertionError(msg);
}

export function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new AssertionError(
      `${msg ?? "values not equal"} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}