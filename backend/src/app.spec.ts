/**
 * @file app.spec.ts
 * @description Integration tests for the Spurly backend API.
 * Mocks the LLM providers and tests the Express application routing, input validation,
 * database updates, and response structures.
 */

import request from 'supertest';
import { app } from './app';
import { prisma } from './config/database';
import { OpenRouterProvider } from './services/llm/openrouter.provider';

// Mock OpenRouterProvider
jest.mock('./services/llm/openrouter.provider', () => {
  return {
    OpenRouterProvider: jest.fn().mockImplementation(() => {
      return {
        generateReply: jest.fn().mockResolvedValue('Mocked response: Returns are accepted within 30 days.'),
      };
    }),
  };
});

describe('Spurly Backend API Integration Tests', () => {
  let createdSessionId: string;

  beforeAll(async () => {
    // Clear databases before running tests
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
  });

  afterAll(async () => {
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /health', () => {
    it('should return 200 and ok status in standard envelope', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('message', 'Health check successful');
      expect(response.body.data).toHaveProperty('status', 'ok');
    });
  });

  describe('POST /chat/message', () => {
    it('should fail with 400 if message is empty', async () => {
      const response = await request(app)
        .post('/chat/message')
        .send({ message: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 400);
      expect(response.body.message).toMatch(/Message cannot be empty/);
      expect(response.body.data).toBeNull();
    });

    it('should fail with 400 if message is spaces', async () => {
      const response = await request(app)
        .post('/chat/message')
        .send({ message: '     ' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 400);
      expect(response.body.message).toMatch(/Message cannot be empty/);
      expect(response.body.data).toBeNull();
    });

    it('should create a new session and return response if sessionId is omitted', async () => {
      const response = await request(app)
        .post('/chat/message')
        .send({ message: 'What is your return policy?' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body.data).toHaveProperty('reply');
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data.reply).toBe('Mocked response: Returns are accepted within 30 days.');
      
      createdSessionId = response.body.data.sessionId;
    });

    it('should append messages and keep conversation context under existing sessionId', async () => {
      const response = await request(app)
        .post('/chat/message')
        .send({
          message: 'Can I return sale items?',
          sessionId: createdSessionId,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.sessionId).toBe(createdSessionId);
    });
  });

  describe('GET /chat/history/:sessionId', () => {
    it('should retrieve conversation history in chronological order', async () => {
      const response = await request(app).get(`/chat/history/${createdSessionId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data.messages.length).toBe(4); // 2 user inputs + 2 replies
      
      // Chronological order verification
      expect(response.body.data.messages[0].sender).toBe('USER');
      expect(response.body.data.messages[0].content).toBe('What is your return policy?');
      expect(response.body.data.messages[1].sender).toBe('AI');
      expect(response.body.data.messages[2].sender).toBe('USER');
      expect(response.body.data.messages[2].content).toBe('Can I return sale items?');
      expect(response.body.data.messages[3].sender).toBe('AI');
    });
  });
});

