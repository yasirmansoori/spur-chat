import axios from 'axios';
import { LLMProvider, PromptMessage } from './llm.service';
import { env } from '../../config/env';
import { LLMError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export class OpenRouterProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly modelName: string;

  constructor() {
    this.apiKey = env.OPENROUTER_API_KEY;
    this.modelName = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
  }

  async generateReply(messages: PromptMessage[], model?: string): Promise<string> {
    try {
      const activeModel = model || this.modelName;
      logger.info({ model: activeModel }, 'Sending request to OpenRouter');

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: activeModel,
          messages,
          // Optional headers to identify site to OpenRouter
          headers: {
            'HTTP-Referer': 'https://github.com/spurly/spurly-support',
            'X-Title': 'Spurly Chat Agent',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000, // 15 seconds timeout
        }
      );

      const reply = response.data?.choices?.[0]?.message?.content;
      if (!reply) {
        throw new Error('Received empty response from OpenRouter API');
      }

      return reply.trim();
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;
      logger.error({ status, message }, 'OpenRouter API Error');
      throw new LLMError(`OpenRouter request failed: ${message}`, error);
    }
  }

  async *generateReplyStream(
    messages: PromptMessage[],
    model?: string,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    try {
      const activeModel = model || this.modelName;
      logger.info({ model: activeModel }, 'Sending streaming request to OpenRouter');

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: activeModel,
          messages,
          stream: true,
          // Optional headers to identify site to OpenRouter
          headers: {
            'HTTP-Referer': 'https://github.com/spurly/spurly-support',
            'X-Title': 'Spurly Chat Agent',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          signal,
        }
      );

      const stream = response.data;
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      for await (const chunk of stream) {
        const chunkStr = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
        buffer += chunkStr;

        while (true) {
          const lineEnd = buffer.indexOf('\n');
          if (lineEnd === -1) break;

          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                logger.error({ error: parsed.error }, 'OpenRouter mid-stream error');
                throw new LLMError(`OpenRouter stream error: ${parsed.error.message}`);
              }
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              if (e instanceof LLMError) throw e;
              // Ignore JSON parse errors for non-JSON lines or partial buffers
            }
          }
        }
      }
    } catch (error: any) {
      if (axios.isCancel(error) || error.name === 'AbortError') {
        logger.info('OpenRouter stream cancelled');
        return;
      }
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;
      logger.error({ status, message }, 'OpenRouter Streaming API Error');
      throw new LLMError(`OpenRouter streaming request failed: ${message}`, error);
    }
  }
}

