/**
 * @file response.ts
 * @description Standard response utility for Spurly backend.
 * Defines a consistent response envelope for all API endpoints (success and error).
 * This structure helps frontend clients parse and handle data uniformly.
 */

import { Response } from 'express';

/**
 * Standard API Response Envelope structure.
 */
export interface ApiResponseEnvelope<T> {
  status: number;
  message: string;
  data: T | null;
}

/**
 * Reusable utility class to format and send standardized Express JSON responses.
 */
export class ApiResponse {
  /**
   * Sends a successful API response with status 2xx.
   * 
   * @param res - Express Response object
   * @param data - The payload to send back to the client
   * @param message - User-friendly context or confirmation message
   * @param status - HTTP status code (defaults to 200)
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Operation completed successfully',
    status: number = 200
  ): void {
    const envelope: ApiResponseEnvelope<T> = {
      status,
      message,
      data,
    };
    res.status(status).json(envelope);
  }

  /**
   * Sends an error API response with status 4xx or 5xx.
   * 
   * @param res - Express Response object
   * @param message - Detailed error message or reason
   * @param status - HTTP status code (defaults to 500)
   */
  static error(
    res: Response,
    message: string = 'An unexpected error occurred',
    status: number = 500
  ): void {
    const envelope: ApiResponseEnvelope<null> = {
      status,
      message,
      data: null,
    };
    res.status(status).json(envelope);
  }
}
