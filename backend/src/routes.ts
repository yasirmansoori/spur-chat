/**
 * @file routes.ts
 * @description Centralized application route dictionary.
 * Exposes a read-only ROUTES object used for configuring backend routes.
 * Using static path definitions prevents typos and makes it simple to refactor endpoints.
 */

export const ROUTES = {
  CHAT: {
    BASE: '/chat',
    SEND_MESSAGE: '/message',
    GET_SESSIONS: '/sessions',
    GET_HISTORY: '/history/:sessionId',
  },
  HEALTH: '/health',
} as const;
