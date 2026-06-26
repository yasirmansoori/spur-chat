/**
 * @file useConversation.ts
 * @description Hook managing conversation session persistence.
 * Synchronizes the active session ID and past session list with localStorage.
 * Uses client-side lazy initializers to safely read state during Next.js hydration.
 */

import { useState, useEffect } from 'react';

const ACTIVE_STORAGE_KEY = 'spurly_chat_active_session_id';
const HISTORY_STORAGE_KEY = 'spurly_chat_past_sessions';

export const useConversation = () => {
  // Safe state initializers for Next.js SSR compatibility
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_STORAGE_KEY);
    }
    return null;
  });

  const [pastSessionIds, setPastSessionIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const savedPastSessions = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedPastSessions) {
        try {
          return JSON.parse(savedPastSessions);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const updateSessionId = (newId: string) => {
    localStorage.setItem(ACTIVE_STORAGE_KEY, newId);
    setSessionId(newId);

    // Sync past sessions
    setPastSessionIds((prev) => {
      if (prev.includes(newId)) return prev;
      const updated = [newId, ...prev];
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeSessionId = (idToRemove: string) => {
    const updated = pastSessionIds.filter((id) => id !== idToRemove);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    setPastSessionIds(updated);

    if (sessionId === idToRemove) {
      localStorage.removeItem(ACTIVE_STORAGE_KEY);
      setSessionId(null);
    }
  };

  const selectActiveSession = (id: string | null) => {
    if (id) {
      localStorage.setItem(ACTIVE_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_STORAGE_KEY);
    }
    setSessionId(id);
  };

  const clearAllSessions = () => {
    localStorage.removeItem(ACTIVE_STORAGE_KEY);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    setSessionId(null);
    setPastSessionIds([]);
  };

  return {
    sessionId,
    pastSessionIds,
    loading,
    updateSessionId,
    removeSessionId,
    selectActiveSession,
    clearAllSessions,
  };
};

