/**
 * @file chat.routes.ts
 * @description Express router for chat-related endpoints.
 * Configures endpoint routes, input validation schema mapping, and rate limiters
 * before routing calls to the ChatController.
 */

import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { ChatService } from '../services/chat.service';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import { LLMService } from '../services/llm/llm.service';
import { OpenRouterProvider } from '../services/llm/openrouter.provider';
import { chatLimiter } from '../middleware/rateLimiter.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { sendMessageSchema } from '../validators/chat.validator';
import { ROUTES } from '../routes';

const router = Router();

// Setup dependency injection
const conversationRepo = new ConversationRepository();
const messageRepo = new MessageRepository();
const openRouterProvider = new OpenRouterProvider();
const llmService = new LLMService(openRouterProvider);
const chatService = new ChatService(conversationRepo, messageRepo, llmService);
const chatController = new ChatController(chatService);

// Route configuration mapping
router.post(
  ROUTES.CHAT.SEND_MESSAGE,
  chatLimiter,
  validateBody(sendMessageSchema),
  chatController.sendMessage
);

router.post(
  ROUTES.CHAT.GET_SESSIONS,
  chatController.getSessionsInfo
);

router.get(
  ROUTES.CHAT.GET_HISTORY,
  chatController.getHistory
);

export default router;
export { chatService }; // Export for seeding or tests if needed

