/**
 * @file rateLimiter.middleware.ts
 * @description Isolated rate limiting middleware for Spurly backend.
 * Defines separate limits for chat endpoints and general endpoints, returning
 * standard formatted JSON errors upon rate limit exhaustion.
 */

import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../utils/response';

/**
 * Chat Rate Limiter: Allows up to 50 requests per 15 minutes.
 * Used to prevent abuse of resource-intensive chat completion endpoints.
 */
export const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: 'Too many messages sent. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    ApiResponse.error(res, options.message, options.statusCode);
  },
});

/**
 * General API Rate Limiter: Allows up to 200 requests per 15 minutes.
 * Used for standard query/metadata endpoints.
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    ApiResponse.error(res, options.message, options.statusCode);
  },
});
