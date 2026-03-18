const pino = require('pino');

// pino-pretty worker thread transport breaks under `node --watch` mode.
// We use `sync: true` in dev to write directly to stdout synchronously,
// which survives process restarts cleanly.
const isDev = process.env.NODE_ENV !== 'production';

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          sync: true, // 🔑 KEY FIX: sync mode prevents loss when --watch restarts worker threads
        },
      })
    : undefined // In production, stream to stdout natively (JSON logs)
);

module.exports = logger;
