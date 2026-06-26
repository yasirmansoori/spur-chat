import { PromptMessage } from './llm.service';
import { FAQ_KNOWLEDGE_BASE } from './knowledgeBase';
import { Message, Sender } from '@prisma/client';

const SYSTEM_PROMPT = `
You are a helpful, professional, and friendly live chat support agent for Spur.

Guidelines:
1. For any questions regarding Spur's store policies, products, services, hours, or procedures, provide accurate information based solely on the Knowledge Base provided below. Do not make up any policies or services.
2. Acknowledge and refer to conversational details provided by the user in the chat history (such as their name or previous inputs in this session) when appropriate.
3. Be extremely concise. Keep responses under 3 sentences unless a detailed list is absolutely necessary.
4. Be friendly, polite, and maintain a professional tone.
5. If the user asks something about our policies, services, or procedures that is not covered in the Knowledge Base, politely say: "I apologize, but I do not have that information. You can reach our human support team at support@spurmart.com and they will be happy to assist you."

Knowledge Base:
${FAQ_KNOWLEDGE_BASE}
`;

export const buildPromptMessages = (
  recentHistory: Message[],
  currentMessageContent: string
): PromptMessage[] => {
  const messages: PromptMessage[] = [];

  // 1. Add system prompt
  messages.push({
    role: 'system',
    content: SYSTEM_PROMPT.trim(),
  });

  // 2. Add history (in chronological order, history from DB is desc, so we reverse it)
  const sortedHistory = [...recentHistory].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  for (const msg of sortedHistory) {
    messages.push({
      role: msg.sender === Sender.USER ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // 3. Add current message
  messages.push({
    role: 'user',
    content: currentMessageContent,
  });

  return messages;
};
