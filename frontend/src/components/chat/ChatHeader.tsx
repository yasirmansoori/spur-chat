/**
 * @file ChatHeader.tsx
 * @description Header component for the Support Chat widget.
 * Dynamically switches display mode depending on whether a chat session is active.
 * Integrates drop-down navigation and close commands with proper accessibility descriptors.
 */

import React, { useState } from 'react';
import { X, ArrowLeft, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  sessionId: string | null;
  startNewChat: () => void;
  selectChat: (id: string | null) => void;
  onClose: () => void;
}

export default function ChatHeader({
  sessionId,
  startNewChat,
  selectChat,
  onClose,
}: ChatHeaderProps) {
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // If in an active chat session (Screen 1)
  if (sessionId !== null) {
    return (
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200/20 flex-shrink-0">
        <DropdownMenu open={isHeaderMenuOpen} onOpenChange={setIsHeaderMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-1 px-3 py-1.5 rounded-full border border-zinc-200 bg-zinc-50/30 hover:bg-zinc-50 text-[11.5px] font-bold text-zinc-700 cursor-pointer active:scale-98 select-none"
                aria-label="Chat menu options"
                aria-expanded={isHeaderMenuOpen}
                aria-haspopup="menu"
              >
                <span>{sessionId === 'new' ? 'New chat' : 'Active chat'}</span>
                <ChevronDown size={11} className="text-zinc-400" />
              </Button>
            }
          />

          <DropdownMenuContent
            align="start"
            className="w-44 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-50 animate-slide-up-fade origin-top-left"
          >
            <DropdownMenuItem
              onClick={() => {
                startNewChat();
                setIsHeaderMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-[10.5px] text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center space-x-2 font-medium cursor-pointer"
            >
              <Plus size={12} />
              <span>Start new chat</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                selectChat(null);
                setIsHeaderMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-[10.5px] text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center space-x-2 font-medium border-t border-zinc-100 cursor-pointer"
            >
              <ArrowLeft size={12} />
              <span>Past conversations</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-50 text-zinc-400 hover:text-zinc-650 transition-colors cursor-pointer"
            aria-label="Close support agent"
            title="Close Support"
          >
            <X size={14} />
          </Button>
        </div>
      </header>
    );
  }

  // If on the home / conversation list screen (Screen 2)
  return (
    <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-zinc-200/20 flex-shrink-0">
      <div>
        <h2 className="text-xs font-extrabold text-zinc-955">Spur Support</h2>
        <p className="text-[10px] text-zinc-400">How can we assist you today?</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-zinc-50 text-zinc-400 hover:text-zinc-650 transition-colors cursor-pointer"
        aria-label="Close support agent"
        title="Close Support"
      >
        <X size={14} />
      </Button>
    </header>
  );
}
