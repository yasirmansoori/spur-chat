/**
 * @file useChat.ts
 * @description Hook coordinating chat completion states, stream parsing, and optimistic updates.
 * Leverages React Query mutations/queries to trigger and fetch messages, while maintaining
 * local message state to append live streaming text tokens in real time.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchChatHistory, fetchSessionsInfo, sendChatMessageStream, MessageResponse } from '../services/api';
import { useConversation } from './useConversation';
import { useState, useEffect, useRef } from 'react';

export const useChat = () => {
  const queryClient = useQueryClient();
  const {
    sessionId,
    pastSessionIds,
    loading: sessionLoading,
    updateSessionId,
    removeSessionId,
    selectActiveSession,
    clearAllSessions,
  } = useConversation();

  const [localMessages, setLocalMessages] = useState<MessageResponse[]>([]);
  const localMessagesRef = useRef<MessageResponse[]>([]);
  const prevSessionIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep localMessagesRef updated with latest state
  useEffect(() => {
    localMessagesRef.current = localMessages;
  }, [localMessages]);

  // 1. Fetch active chat history
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    error: historyError,
  } = useQuery({
    queryKey: ['chatHistory', sessionId],
    queryFn: () => fetchChatHistory(sessionId!),
    enabled: !!sessionId && sessionId !== 'new',
    staleTime: 5000,
  });

  // 2. Fetch past conversations metadata info list
  const {
    data: pastConversations,
    isLoading: isConversationsListLoading,
  } = useQuery({
    queryKey: ['pastConversations', pastSessionIds],
    queryFn: () => fetchSessionsInfo(pastSessionIds),
    enabled: pastSessionIds.length > 0,
  });

  // Mutation to send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, model }: { message: string; model?: string | null }) => {
      const activeId = sessionId === 'new' ? null : sessionId;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      let accumulatedReply = '';
      let serverSessionId = activeId;

      // Add a placeholder message with empty content to local state
      setLocalMessages((prev) => [
        ...prev,
        {
          sender: 'AI',
          content: '',
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        await sendChatMessageStream(
          message,
          activeId,
          model || null,
          (chunk) => {
            if (chunk.sessionId) {
              serverSessionId = chunk.sessionId;
              updateSessionId(chunk.sessionId);
            }
            if (chunk.token) {
              accumulatedReply += chunk.token;
              setLocalMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.sender === 'AI') {
                  last.content = accumulatedReply;
                }
                return updated;
              });
            }
            if (chunk.error) {
              throw new Error(chunk.error);
            }
          },
          controller.signal
        );
      } finally {
        abortControllerRef.current = null;
      }

      return { sessionId: serverSessionId, reply: accumulatedReply };
    },
    onMutate: async ({ message }) => {
      // Optimistic update for User message
      const userMessage: MessageResponse = {
        sender: 'USER',
        content: message,
        createdAt: new Date().toISOString(),
      };
      
      setLocalMessages((prev) => [...prev, userMessage]);
    },
    onSuccess: (data) => {
      // Update cache with the latest local messages before invalidating to prevent flickering/empty state
      queryClient.setQueryData(['chatHistory', data.sessionId], localMessagesRef.current);
      // Invalidate queries to refresh lists and details
      queryClient.invalidateQueries({ queryKey: ['chatHistory', data.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['pastConversations'] });
    },
    onError: (err: Error) => {
      const isAborted = err.name === 'AbortError' || err.message?.includes('aborted');
      const errorMessage = isAborted ? 'Generation stopped by user.' : (err.message || 'Failed to send message.');
      
      setLocalMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.sender === 'AI') {
          if (last.content) {
            last.content += `\n\n_${errorMessage}_`;
          } else {
            last.content = isAborted ? errorMessage : `Error: ${errorMessage}`;
          }
        } else {
          updated.push({
            sender: 'AI',
            content: isAborted ? errorMessage : `Error: ${errorMessage}`,
            createdAt: new Date().toISOString(),
          });
        }
        return updated;
      });
    },
  });

  const isSending = sendMessageMutation.isPending;

  // Sync historical messages with state, but not while actively sending/streaming a message.
  // Use prevSessionIdRef to track when the sessionId actually changed (e.g. user selected a different chat)
  // versus when it is a query refresh of the same chat, avoiding any jitter.
  useEffect(() => {
    if (isSending) {
      prevSessionIdRef.current = sessionId;
      return;
    }

    if (sessionId !== prevSessionIdRef.current) {
      // Session actually changed (user switched chats or initialized a new chat)
      if (historyData) {
        setLocalMessages(historyData);
        prevSessionIdRef.current = sessionId;
      } else if (sessionId === 'new' || !sessionId) {
        setLocalMessages([]);
        prevSessionIdRef.current = sessionId;
      } else {
        // Clear history only when switching to a different loading session
        setLocalMessages([]);
        prevSessionIdRef.current = sessionId;
      }
    } else {
      // We are in the same session (ongoing chat). Update only if historyData is loaded.
      if (historyData) {
        setLocalMessages(historyData);
      }
    }
  }, [historyData, isSending, sessionId]);

  const cancelGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const startNewChat = () => {
    selectActiveSession('new');
    setLocalMessages([]);
  };

  const deleteChat = (id: string) => {
    removeSessionId(id);
    queryClient.invalidateQueries({ queryKey: ['pastConversations'] });
  };

  return {
    messages: localMessages,
    pastConversations: pastConversations || [],
    isLoading: sessionLoading || (!!sessionId && sessionId !== 'new' && isHistoryLoading),
    isListLoading: isConversationsListLoading,
    isSending: sendMessageMutation.isPending,
    error: historyError,
    sendMessage: (message: string) => sendMessageMutation.mutate({ message }),
    cancelGenerating,
    startNewChat,
    deleteChat,
    selectChat: selectActiveSession,
    clearAll: clearAllSessions,
    sessionId,
  };
};

