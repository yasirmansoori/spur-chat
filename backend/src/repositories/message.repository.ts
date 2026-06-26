/**
 * @file message.repository.ts
 * @description Repository class managing database operations on the Message model.
 * Performs database queries using Prisma client to store user and AI messages and fetch recent records.
 */

import { prisma } from '../config/database';
import { Message, Sender } from '@prisma/client';
import { DatabaseError } from '../utils/errors';

export class MessageRepository {
  async create(conversationId: string, sender: Sender, content: string): Promise<Message> {
    try {
      return await prisma.message.create({
        data: {
          conversationId,
          sender,
          content,
        },
      });
    } catch (error) {
      throw new DatabaseError(`Failed to save message for conversation: ${conversationId}`, error);
    }
  }

  async findRecentByConversationId(conversationId: string, limit: number): Promise<Message[]> {
    try {
      return await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      throw new DatabaseError(`Failed to retrieve messages for conversation: ${conversationId}`, error);
    }
  }
}

