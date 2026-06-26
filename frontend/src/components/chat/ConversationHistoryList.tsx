/**
 * @file ConversationHistoryList.tsx
 * @description Renders the conversation log list (Screen 2) for the Support Chat.
 * Displays previous chat cards, enables session selection, triggers session deletion,
 * and renders clean fallback empty states.
 */

import React from 'react';
import { Trash2, ChevronRight, MessageSquareText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionInfoResponse } from '../../services/api';
import { formatDate } from '../../lib/date';

interface ConversationHistoryListProps {
  pastConversations: SessionInfoResponse[];
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  startNewChat: () => void;
  clearAll: () => void;
}

export default function ConversationHistoryList({
  pastConversations,
  selectChat,
  deleteChat,
  startNewChat,
  clearAll,
}: ConversationHistoryListProps) {
  return (
    <>
      {/* Pinned Label Header */}
      <div className="px-5 pt-4 pb-2 bg-white flex-shrink-0 select-none">
        <h3 className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
          Previous conversations
        </h3>
      </div>

      {/* List Container (Scrollable Cards Area) */}
      <div className="flex-1 overflow-y-auto px-5 py-3.5 bg-white scrollbar-thin">
        {pastConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-zinc-200 rounded-xl">
            <MessageSquareText size={20} className="text-zinc-300 mb-2" />
            <p className="text-[10px] text-zinc-400">No chat history available.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastConversations.map((chat) => (
              <div
                key={chat.id}
                role="button"
                tabIndex={0}
                className="group w-full flex items-center justify-between p-3.5 rounded-xl border border-border bg-zinc-50/50 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer transition-all duration-150"
                onClick={() => selectChat(chat.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectChat(chat.id);
                  }
                }}
                aria-label={`Open conversation from ${formatDate(chat.lastMessage?.createdAt || chat.createdAt)}`}
              >
                <div className="flex-1 min-w-0 pr-2 select-none">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] text-zinc-400 font-semibold">
                      {formatDate(chat.lastMessage?.createdAt || chat.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-zinc-700 truncate">
                    {chat.lastMessage
                      ? `${chat.lastMessage.sender === 'USER' ? 'You' : 'AI'}: ${chat.lastMessage.content}`
                      : 'New Conversation'}
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 transition-all duration-150 cursor-pointer"
                    aria-label={`Delete conversation from ${formatDate(chat.lastMessage?.createdAt || chat.createdAt)}`}
                    title="Delete Chat"
                  >
                    <Trash2 size={12} />
                  </Button>
                  <ChevronRight size={13} className="text-zinc-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pinned Footer (Start New Chat & Delete All) */}
      <footer className="p-5 pb-2 pt-2 bg-white border-t border-zinc-200/20 flex-shrink-0 flex flex-col space-y-3.5">
        <Button
          onClick={startNewChat}
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-colors shadow-sm active:scale-98 cursor-pointer"
          aria-label="Start a new chat session"
        >
          <Plus size={14} />
          <span>Start a new chat</span>
        </Button>

        {pastConversations.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="link"
              onClick={clearAll}
              className="text-[10px] font-bold text-zinc-400 hover:text-red-500 transition-colors flex items-center space-x-1 h-auto p-0 cursor-pointer"
              aria-label="Delete all chat logs"
            >
              <Trash2 size={11} />
              <span>Delete all chats</span>
            </Button>
          </div>
        )}
      </footer>
    </>
  );
}
