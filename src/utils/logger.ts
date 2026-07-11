/**
 * J6 — Structured logging với pino, nhưng giữ API cũ
 * (.info/warn/error/debug nhận message string, không phá caller hiện tại).
 */
import pino from 'pino';
import { config } from '../config';

const isProd = config.nodeEnv === 'production';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  base: { service: 'tradelink-server', env: config.nodeEnv },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service,env' },
        },
      }),
});

function formatArgs(message: string, args: unknown[]): Record<string, unknown> {
  if (args.length === 0) return {};
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    return { context: message, extra: args[0] };
  }
  return { context: message, args };
}

export const logger = {
  info(message: string, ...args: unknown[]): void {
    pinoLogger.info(formatArgs(message, args), message);
  },
  warn(message: string, ...args: unknown[]): void {
    pinoLogger.warn(formatArgs(message, args), message);
  },
  error(message: string, ...args: unknown[]): void {
    pinoLogger.error(formatArgs(message, args), message);
  },
  debug(message: string, ...args: unknown[]): void {
    pinoLogger.debug(formatArgs(message, args), message);
  },
  /** Direct access to underlying pino logger (trả về instance nếu caller cần binding child logger). */
  raw(): pino.Logger {
    return pinoLogger;
  },
};

export function logError(context: string, err: unknown, extra?: Record<string, unknown>): void {
  pinoLogger.error(
    { context, err: err instanceof Error ? { message: err.message, stack: err.stack } : err, ...(extra ?? {}) },
    context,
  );
}
