/**
 * @file chat.service.ts
 * @description Core business logic for chat interactions.
 * Orchestrates session retrieval/creation, logs messages, prepares contextual LLM prompt histories,
 * handles LLM stream generations, and queries historic message records.
 */

import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import { LLMService } from './llm/llm.service';
import { buildPromptMessages } from './llm/prompts';
import { Sender, Message } from '@prisma/client';
import { logger } from '../utils/logger';

export interface ChatServiceResponse {
  reply: string;
  sessionId: string;
}

export interface SessionInfo {
  id: string;
  createdAt: Date;
  lastMessage: {
    sender: Sender;
    content: string;
    createdAt: Date;
  } | null;
}

export class ChatService {
  private readonly MAX_CONTEXT_MESSAGES = 10;


  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly llmService: LLMService
  ) {}

  async processMessage(
    content: string,
    sessionId?: string | null,
    model?: string
  ): Promise<ChatServiceResponse> {
    let conversationId = sessionId;

    // 1. Retrieve or create conversation
    if (!conversationId) {
      const newConversation = await this.conversationRepo.create();
      conversationId = newConversation.id;
      logger.info({ conversationId }, 'Created new chat session');
    } else {
      const existing = await this.conversationRepo.findById(conversationId);
      if (!existing) {
        // Fallback: create new conversation if session not found in DB
        const newConversation = await this.conversationRepo.create();
        conversationId = newConversation.id;
        logger.warn(
          { originalSessionId: sessionId, conversationId },
          'Session ID not found, initialized new session'
        );
      } else {
        logger.debug({ conversationId }, 'Using existing chat session');
      }
    }

    // 2. Fetch history context
    const recentMessages = await this.messageRepo.findRecentByConversationId(
      conversationId,
      this.MAX_CONTEXT_MESSAGES
    );

    // 3. Save User Message to database
    await this.messageRepo.create(conversationId, Sender.USER, content);

    // 4. Construct prompts and generate reply
    const promptMessages = buildPromptMessages(recentMessages, content);
    let reply: string;
    try {
      reply = await this.llmService.generateReply(promptMessages, model);
    } catch (error) {
      // In case LLM fails, we log it and provide a user-friendly generic fallback reply
      logger.error({ conversationId, error }, 'LLM error, using fallback support reply');
      reply = 'I am currently experiencing connection difficulties. Please try again in a moment, or contact support directly at support@spurmart.com.';
    }

    // 5. Save AI reply to database
    await this.messageRepo.create(conversationId, Sender.AI, reply);

    return {
      reply,
      sessionId: conversationId,
    };
  }

  async processMessageStream(
    content: string,
    sessionId?: string | null,
    model?: string,
    signal?: AbortSignal
  ): Promise<{
    sessionId: string;
    stream: AsyncGenerator<string, void, unknown>;
    saveCallback: (fullReply: string) => Promise<void>;
  }> {
    let conversationId = sessionId;

    // 1. Retrieve or create conversation
    if (!conversationId) {
      const newConversation = await this.conversationRepo.create();
      conversationId = newConversation.id;
      logger.info({ conversationId }, 'Created new chat session for streaming');
    } else {
      const existing = await this.conversationRepo.findById(conversationId);
      if (!existing) {
        // Fallback: create new conversation if session not found in DB
        const newConversation = await this.conversationRepo.create();
        conversationId = newConversation.id;
        logger.warn(
          { originalSessionId: sessionId, conversationId },
          'Session ID not found for streaming, initialized new session'
        );
      } else {
        logger.debug({ conversationId }, 'Using existing chat session for streaming');
      }
    }

    // 2. Fetch history context
    const recentMessages = await this.messageRepo.findRecentByConversationId(
      conversationId,
      this.MAX_CONTEXT_MESSAGES
    );

    // 3. Save User Message to database
    await this.messageRepo.create(conversationId, Sender.USER, content);

    // 4. Construct prompts
    const promptMessages = buildPromptMessages(recentMessages, content);

    // 5. Instantiate stream
    const llmStream = this.llmService.generateReplyStream(promptMessages, model, signal);

    // Define the DB save callback for when the stream finishes
    const saveCallback = async (fullReply: string) => {
      if (fullReply.trim()) {
        await this.messageRepo.create(conversationId!, Sender.AI, fullReply.trim());
        logger.info({ conversationId }, 'Saved streaming AI response to database');
      }
    };

    return {
      sessionId: conversationId,
      stream: llmStream,
      saveCallback,
    };
  }

  async getHistory(conversationId: string): Promise<Message[]> {
    // Return history in chronological order
    const messages = await this.messageRepo.findRecentByConversationId(conversationId, 100);
    return messages.reverse();
  }

  /**
   * Retrieves session metadata and the last message info for multiple session IDs,
   * sorted by the timestamp of the last message (or creation date) descending.
   */
  async getSessionsInfo(sessionIds: string[]): Promise<SessionInfo[]> {
    const results: SessionInfo[] = [];
    for (const id of sessionIds) {
      try {
        const conversation = await this.conversationRepo.findById(id);
        if (conversation) {
          const lastMessages = await this.messageRepo.findRecentByConversationId(id, 1);
          const lastMessage = lastMessages[0] || null;
          results.push({
            id: conversation.id,
            createdAt: conversation.createdAt,
            lastMessage: lastMessage
              ? {
                  sender: lastMessage.sender,
                  content: lastMessage.content,
                  createdAt: lastMessage.createdAt,
                }
              : null,
          });
        }
      } catch (error) {
        logger.error({ id, error }, 'Failed to fetch session info for history');
      }
    }
    return results.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || a.createdAt;
      const timeB = b.lastMessage?.createdAt || b.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  }
}

