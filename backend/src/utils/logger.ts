import { pino, Logger, LoggerOptions, stdTimeFunctions } from 'pino';
import { getConfig } from '../config/index.js';

let logger: Logger;

export function initLogger(): Logger {
  const config = getConfig();

  const options: LoggerOptions = {
    level: config.LOG_LEVEL,
    base: { pid: process.pid },
    timestamp: stdTimeFunctions.isoTime,
  };

  if (config.NODE_ENV === 'development') {
    options.transport = { target: 'pino-pretty', options: { colorize: true } };
  }

  logger = pino(options);

  return logger;
}

export function getLogger(): Logger {
  if (!logger) {
    throw new Error('Logger not initialized');
  }
  return logger;
}
