import React, { useEffect, useRef } from 'react';
import { MessageResponse } from '../services/api';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { RotateCcw, Puzzle, MessageSquareCode } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ChatWindowProps {
  messages: MessageResponse[];
  isSending: boolean;
  onSampleClick: (text: string) => void;
}

export default function ChatWindow({ messages, isSending, onSampleClick }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto Scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-6 text-center select-none max-w-sm mx-auto overflow-y-auto scrollbar-thin">
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight font-sans">
          How can I help?
        </h2>
        <p className="mt-1 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
          Spurly assistant
        </p>

        {/* Branding box about Spurly chatbot from Spur */}
        <Card className="my-4 px-3.5 py-2.5 rounded-2xl bg-zinc-50/50 border border-zinc-100 max-w-[290px] mx-auto text-left shadow-none">
          <p className="text-[10.5px] text-zinc-500 leading-relaxed font-sans">
            <span className="font-bold text-zinc-700">Meet Spurly:</span> Your AI customer support agent for Spur Mart. I can answer store policy questions, guide you through channels and integrations, or hand you off to a human expert.
          </p>
        </Card>

        {/* Quick Prompts */}
        <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-[390px] mx-auto">
          <Button
            variant="outline"
            size="xs"
            onClick={() => onSampleClick('What is your return policy?')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border-dashed border-zinc-200 text-[10px] font-semibold text-zinc-600 hover:border-zinc-350 hover:bg-zinc-50/40 transition-all duration-150 shadow-sm cursor-pointer select-none"
          >
            <RotateCcw size={11} className="text-zinc-400" />
            <span>Return policy & refunds</span>
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => onSampleClick('How do I integrate Shopify?')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border-dashed border-zinc-200 text-[10px] font-semibold text-zinc-600 hover:border-zinc-355 hover:bg-zinc-50/40 transition-all duration-150 shadow-sm cursor-pointer select-none"
          >
            <Puzzle size={11} className="text-zinc-400" />
            <span>Integrate Shopify store</span>
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => onSampleClick('What channels are supported?')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border-dashed border-zinc-200 text-[10px] font-semibold text-zinc-600 hover:border-zinc-360 hover:bg-zinc-50/40 transition-all duration-150 shadow-sm cursor-pointer select-none"
          >
            <MessageSquareCode size={11} className="text-zinc-400" />
            <span>Supported chat channels</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 bg-white space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-205">
      {messages.map((msg, index) => {
        if (msg.sender === 'AI' && !msg.content) {
          return null;
        }
        return <MessageBubble key={index} message={msg} />;
      })}

      {isSending && (messages.length === 0 || (messages[messages.length - 1]?.sender === 'AI' && !messages[messages.length - 1]?.content)) && (
        <div className="flex justify-start mb-3">
          <div className="flex items-start space-x-2.5">
            <Avatar size="sm" className="w-7 h-7">
              <AvatarFallback className="text-[10px] group-data-[size=sm]/avatar:text-[10px] font-bold bg-zinc-100 border border-zinc-200 text-zinc-500 shadow-sm">
                S
              </AvatarFallback>
            </Avatar>
            <TypingIndicator />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

