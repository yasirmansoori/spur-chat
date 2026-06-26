import React from 'react';
import { MessageResponse } from '../services/api';
import { CheckCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MessageBubbleProps {
  message: MessageResponse;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === 'USER';
  const isError = message.content.startsWith('Error:');

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-3.5 animate-slide-up-fade`}>
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* TOP METADATA ROW */}
        {isUser ? (
          <div className="flex items-center space-x-1 mb-1 text-[10px] text-zinc-400 select-none">
            <CheckCheck size={13} className="text-zinc-400" />
            <span>{formattedTime}</span>
          </div>
        ) : (
          <div className="ml-9 flex items-center space-x-1.5 mb-0.5 text-[10px] text-zinc-400">
            <span className="font-semibold text-zinc-600">Support</span>
            <span>•</span>
            <span>{formattedTime}</span>
          </div>
        )}

        {/* BUBBLE WRAPPER */}
        <div className="flex items-start space-x-2">
          {!isUser && (
            <Avatar size="sm" className="w-7 h-7">
              <AvatarFallback className="text-[10px] group-data-[size=sm]/avatar:text-[10px] font-bold bg-zinc-100 border border-zinc-200 text-zinc-600 shadow-sm">
                S
              </AvatarFallback>
            </Avatar>
          )}

          <div className="flex flex-col items-start">
            <div
              className={`px-3.5 py-2 rounded-xl text-xs leading-relaxed border transition-colors duration-150 ${
                isUser
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-100 rounded-tr-none'
                  : isError
                  ? 'bg-red-50/50 border-red-200 text-red-900 rounded-tl-none'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-850 rounded-tl-none'
              }`}
            >
              {isError ? (
                <span className="text-red-655 font-semibold">{message.content.replace('Error:', '')}</span>
              ) : (
                message.content
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
