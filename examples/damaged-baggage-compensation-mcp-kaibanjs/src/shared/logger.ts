import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
const logLevel = (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info';

export function createLogger(name: string): pino.Logger {
  if (isProd) {
    return pino({ name, level: logLevel });
  }
  return pino({
    name,
    level: logLevel,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss dd/mm/yyyy',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  });
}

export default createLogger;
