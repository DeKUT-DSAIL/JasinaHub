/**
 * Centralised logger. In production builds (`import.meta.env.PROD`) the
 * `log`, `info`, and `debug` channels are silenced to keep the console clean
 * and avoid leaking diagnostic data. `warn` and `error` always pass through
 * so real problems remain visible (and observable to any future Sentry-style
 * sink wired in here).
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.error("Failed to fetch logs", err);
 */

const isProd = import.meta.env.PROD;

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

export const logger = {
  log: isProd ? noop : ((...args: unknown[]) => console.log(...args)) as LogFn,
  info: isProd ? noop : ((...args: unknown[]) => console.info(...args)) as LogFn,
  debug: isProd ? noop : ((...args: unknown[]) => console.debug(...args)) as LogFn,
  warn: ((...args: unknown[]) => console.warn(...args)) as LogFn,
  error: ((...args: unknown[]) => console.error(...args)) as LogFn,
};