/**
 * @file validation.middleware.ts
 * @description Express middleware for input validation using Zod.
 * Validates request body structures prior to controller execution, ensuring
 * that only properly structured payloads reach the core business logic.
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Higher-order middleware function to validate Request body against a Zod schema.
 * Throws a ValidationError if the validation fails, which gets caught by the error handler.
 * 
 * @param schema - Zod Schema object to validate the request body against
 */
export const validateBody = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      // Map error messages to a comma-separated string
      const errorMsg = parsed.error.errors.map((e) => e.message).join(', ');
      next(new ValidationError(errorMsg));
      return;
    }
    // Assign parsed data back to req.body for type-safety
    req.body = parsed.data;
    next();
  };
};
