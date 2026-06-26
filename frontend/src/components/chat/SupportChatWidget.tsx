/**
 * @file SupportChatWidget.tsx
 * @description Main container for the floating chat widget.
 * Coordinates window expansion, bubble animations, layouts for chat screens,
 * and handles trigger interaction and ARIA dialog roles.
 */

import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '../../hooks/useChat';
import ChatHeader from './ChatHeader';
import ChatWindow from '../ChatWindow';
import ChatInput from '../ChatInput';
import ConversationHistoryList from './ConversationHistoryList';

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    messages,
    pastConversations,
    isSending,
    sendMessage,
    cancelGenerating,
    startNewChat,
    deleteChat,
    selectChat,
    clearAll,
    sessionId,
  } = useChat();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Expanded Chat Window Container - GLASSMORPHIC */}
      <div
        role="dialog"
        aria-label="Spur Customer Support Chat"
        aria-hidden={!isOpen}
        className={`mb-4 w-[420px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)] bg-white border border-zinc-200/40 rounded-3xl flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ease-out origin-bottom-right pointer-events-auto ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        {/* Shared Chat Header */}
        <ChatHeader
          sessionId={sessionId}
          startNewChat={startNewChat}
          selectChat={selectChat}
          onClose={() => setIsOpen(false)}
        />

        {/* SCREEN 1: ACTIVE CHAT SCREEN */}
        {sessionId !== null ? (
          <>
            {/* Chat message history window */}
            <ChatWindow
              messages={messages}
              isSending={isSending}
              onSampleClick={sendMessage}
            />

            {/* Footer Input Area */}
            <footer className="p-3 bg-white border-t border-zinc-200/20 flex-shrink-0">
              <ChatInput
                onSend={sendMessage}
                disabled={isSending}
                onCancel={cancelGenerating}
              />
            </footer>
          </>
        ) : (
          /* SCREEN 2: CONVERSATION HISTORY LIST / HOME SCREEN */
          <ConversationHistoryList
            pastConversations={pastConversations}
            selectChat={selectChat}
            deleteChat={deleteChat}
            startNewChat={startNewChat}
            clearAll={clearAll}
          />
        )}
      </div>

      {/* Floating Bubble Trigger Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={`pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full border shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 p-0 ${
          isOpen
            ? 'bg-white border-zinc-200 text-zinc-700 shadow-zinc-200/50 hover:bg-zinc-50'
            : 'bg-zinc-950 border-zinc-900 text-white hover:bg-zinc-900 shadow-zinc-950/20'
        }`}
        aria-label={isOpen ? "Close Support Chat" : "Open Support Chat"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Open Support Chat"
      >
        {isOpen ? <X size={18} /> : <MessageSquare size={18} />}
      </Button>
    </div>
  );
}
