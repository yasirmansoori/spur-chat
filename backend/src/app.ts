/**
 * @file app.ts
 * @description Main Express application configuration.
 * Configures global middlewares (CORS, body parser, rate limiters, logging)
 * and mounts centralized application routers.
 */

import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { generalApiLimiter } from './middleware/rateLimiter.middleware';
import { ROUTES } from './routes';
import { ApiResponse } from './utils/response';
import chatRouter from './routes/chat.routes';

const app = express();

// Middlewares
app.use(
  cors({
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(requestLogger);

// Global API rate limiting
app.use(generalApiLimiter);

// Routes
app.use(ROUTES.CHAT.BASE, chatRouter);

// Health check endpoint
app.get(ROUTES.HEALTH, (req, res) => {
  ApiResponse.success(
    res,
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    'Health check successful'
  );
});

// Error handling middleware (must be registered last)
app.use(errorMiddleware);

export default app;
export { app };

