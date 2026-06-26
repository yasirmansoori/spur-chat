export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message || 'Database error occurred', 500);
    if (originalError) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack || originalError}`;
    }
  }
}

export class LLMError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message || 'LLM API communication failed', 502);
    if (originalError) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack || originalError}`;
    }
  }
}
