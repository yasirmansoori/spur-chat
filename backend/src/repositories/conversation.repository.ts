/**
 * @file conversation.repository.ts
 * @description Repository class managing database operations on the Conversation model.
 * Performs database queries using Prisma client for session creation and lookup.
 */

import { prisma } from '../config/database';
import { Conversation } from '@prisma/client';
import { DatabaseError } from '../utils/errors';

export class ConversationRepository {
  async create(): Promise<Conversation> {
    try {
      return await prisma.conversation.create({ data: {} });
    } catch (error) {
      throw new DatabaseError('Failed to create conversation', error);
    }
  }

  async findById(id: string): Promise<Conversation | null> {
    try {
      return await prisma.conversation.findUnique({
        where: { id },
      });
    } catch (error) {
      throw new DatabaseError(`Failed to find conversation by ID: ${id}`, error);
    }
  }
}

