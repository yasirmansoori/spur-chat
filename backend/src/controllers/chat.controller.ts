/**
 * @file chat.controller.ts
 * @description Controller for handling chat-related API endpoints.
 * Handles user messages (streaming/non-streaming), fetches session lists,
 * and retrieves chronological conversation history. All responses use the unified API response wrapper.
 */

import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service';
import { SendMessageInput } from '../validators/chat.validator';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { ApiResponse } from '../utils/response';

export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Sends a user message to the LLM agent.
   * Supports both Server-Sent Events (SSE) streaming and standard JSON HTTP response.
   */
  sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Input is pre-validated by the validateBody middleware
      const { message, sessionId, stream, model } = req.body as SendMessageInput;
      const shouldStream = stream && env.STREAM_ENABLED;

      if (shouldStream) {
        const abortController = new AbortController();
        req.on('close', () => {
          logger.info('Client closed connection, aborting LLM stream');
          abortController.abort();
        });

        // Set SSE Headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        let result;
        try {
          result = await this.chatService.processMessageStream(message, sessionId, model || undefined, abortController.signal);
        } catch (err: any) {
          logger.error({ err }, 'Error initializing stream');
          res.write(`data: ${JSON.stringify({ error: err.message || 'Failed to start stream' })}\n\n`);
          res.end();
          return;
        }

        // Send newly created or existing session ID first
        res.write(`data: ${JSON.stringify({ sessionId: result.sessionId })}\n\n`);

        let accumulatedReply = '';
        try {
          for await (const chunk of result.stream) {
            accumulatedReply += chunk;
            res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
          }

          // Save the full response upon successful stream completion
          await result.saveCallback(accumulatedReply);
          res.write('data: [DONE]\n\n');
        } catch (streamErr: any) {
          logger.error({ streamErr }, 'Error during stream generation');
          res.write(`data: ${JSON.stringify({ error: streamErr.message || 'Error during streaming' })}\n\n`);
          
          if (accumulatedReply.trim()) {
            await result.saveCallback(accumulatedReply);
          }
        } finally {
          res.end();
        }
      } else {
        const result = await this.chatService.processMessage(message, sessionId, model || undefined);
        ApiResponse.success(res, result, 'Message processed successfully');
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves conversation history for a given sessionId, sorted in chronological order.
   */
  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId } = req.params;
      if (!sessionId) {
        throw new ValidationError('Session ID parameter is required');
      }

      const history = await this.chatService.getHistory(sessionId);
      
      const responseData = {
        messages: history.map((m) => ({
          sender: m.sender,
          content: m.content,
          createdAt: m.createdAt,
        })),
      };

      ApiResponse.success(res, responseData, 'Chat history retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves meta-information for a list of sessionIds.
   */
  getSessionsInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionIds } = req.body;
      if (!Array.isArray(sessionIds)) {
        throw new ValidationError('sessionIds must be an array of strings');
      }

      const info = await this.chatService.getSessionsInfo(sessionIds);
      ApiResponse.success(res, info, 'Sessions info retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

