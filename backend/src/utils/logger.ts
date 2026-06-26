import pino from 'pino';
import { env } from '../config/env';

const transport = env.NODE_ENV === 'development'
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    })
  : undefined;

export const logger = pino(
  {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'env.OPENROUTER_API_KEY'],
      censor: '[REDACTED]',
    },
  },
  transport
);
