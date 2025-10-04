import pino from 'pino';

/**
 * Creates a namespaced pino logger instance (Pino v10-compatible).
 * In development, logs are prettified using `pino-pretty`. In production, logs go to stdout.
 */
export function createLogger(moduleName: string) {
  const isDev = process.env.NODE_ENV !== 'production';
  const level = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

  // Use pino-pretty only in development to avoid overhead in production
  const transport = isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          singleLine: false,
        },
      })
    : undefined;

  // Bind module name for easy filtering in logs
  return pino(
    {
      level,
      base: { module: moduleName },
    },
    transport,
  );
}

/**
 * Returns a default logger (module name: App).
 */
export function getLogger() {
  return createLogger('App');
}
