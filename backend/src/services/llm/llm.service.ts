export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  generateReply(messages: PromptMessage[], model?: string): Promise<string>;
  generateReplyStream(
    messages: PromptMessage[],
    model?: string,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown>;
}

export class LLMService {
  constructor(private readonly provider: LLMProvider) {}

  async generateReply(messages: PromptMessage[], model?: string): Promise<string> {
    return this.provider.generateReply(messages, model);
  }

  generateReplyStream(
    messages: PromptMessage[],
    model?: string,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    return this.provider.generateReplyStream(messages, model, signal);
  }
}
