/**
 * @file api.ts
 * @description Frontend API service for interacting with the Spurly backend.
 * Defines payload models, initializes the Axios client, manages HTTP requests to chat endpoints,
 * maps standardized response wrappers, and reads SSE chat completion token streams.
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20 seconds
});

/**
 * Standard API Response wrapper matching the backend structure.
 */
export interface StandardApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface MessageResponse {
  sender: 'USER' | 'AI';
  content: string;
  createdAt: string;
}

export interface SessionInfoResponse {
  id: string;
  createdAt: string;
  lastMessage: {
    sender: 'USER' | 'AI';
    content: string;
    createdAt: string;
  } | null;
}

/**
 * Fetches the conversation history for a specific sessionId.
 */
export const fetchChatHistory = async (sessionId: string): Promise<MessageResponse[]> => {
  const response = await api.get<StandardApiResponse<{ messages: MessageResponse[] }>>(`/chat/history/${sessionId}`);
  return response.data.data.messages;
};

/**
 * Fetches meta-information list for multiple sessionIds.
 */
export const fetchSessionsInfo = async (sessionIds: string[]): Promise<SessionInfoResponse[]> => {
  const response = await api.post<StandardApiResponse<SessionInfoResponse[]>>('/chat/sessions', {
    sessionIds,
  });
  return response.data.data;
};

/**
 * Initiates an SSE connection to stream chat completion tokens from the agent.
 */
export const sendChatMessageStream = async (
  message: string,
  sessionId: string | null,
  model: string | null,
  onChunk: (chunk: { token?: string; sessionId?: string; error?: string }) => void,
  signal?: AbortSignal
): Promise<void> => {
  const response = await fetch(`${API_URL}/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      sessionId,
      stream: true,
      model,
    }),
    signal,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to send message');
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    onChunk({ sessionId: data.data?.sessionId, token: data.data?.reply });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const lineEnd = buffer.indexOf('\n');
        if (lineEnd === -1) break;

        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            onChunk(parsed);
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }
};


