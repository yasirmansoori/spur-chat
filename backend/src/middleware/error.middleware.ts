/**
 * @file error.middleware.ts
 * @description Global Express error handling middleware.
 * Catches all thrown application and database errors, logging details,
 * and mapping them to standard structured API responses.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { ApiResponse } from '../utils/response';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  logger.error(err, `Error occurred during ${req.method} ${req.path}`);

  if (err instanceof AppError) {
    ApiResponse.error(res, err.message, err.statusCode);
    return;
  }

  // Generic internal server error
  const message = env.NODE_ENV === 'production'
    ? 'Something went wrong.'
    : err.message;

  const statusCode = 500;
  
  // Format consistent error response
  res.status(statusCode).json({
    status: statusCode,
    message,
    data: env.NODE_ENV !== 'production' ? { stack: err.stack } : null,
  });
};

