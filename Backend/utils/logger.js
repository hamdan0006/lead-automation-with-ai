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
    ? require('pino-pretty')({
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        sync: true,
      })
    : pino.destination({ sync: true }) // In production, sync stdout is safer for crash logging
);

module.exports = logger;
