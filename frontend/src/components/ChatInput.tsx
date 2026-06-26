import React, { useState, useRef, KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  onCancel?: () => void;
}

export default function ChatInput({
  onSend,
  disabled,
  onCancel
}: ChatInputProps) {
  const [text, setText] = useState('');

  const maxLength = 1000;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (disabled || !text.trim()) return;
    onSend(text.trim());
    setText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= maxLength) {
      setText(val);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  };



  return (
    <div className="flex flex-col space-y-2 p-2 bg-[#fafafa]/90 border border-zinc-200/40 rounded-2xl focus-within:border-zinc-300/50 focus-within:bg-white transition-all duration-200 shadow-sm">

      {/* Input area */}
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Generating response...' : 'Ask a question or make a request'}
        disabled={disabled}
        rows={1}
        className="w-full max-h-[100px] resize-none bg-transparent border-0 px-2.5 py-1 text-xs text-zinc-900 placeholder-zinc-400 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:border-transparent scrollbar-thin scrollbar-thumb-zinc-200 font-sans min-h-6"
      />

      {/* Toolbar Area */}
      <div className="flex items-center justify-between px-1.5 pt-1 border-t border-zinc-200/20">

        {/* Left Action Elements: Character Count */}
        <div className="text-[10px] font-medium text-zinc-400 select-none px-1">
          {text.length} / {maxLength}
        </div>

        {/* Right Action Elements: Send button only */}
        <div className="flex items-center space-x-1.5">
          {disabled && onCancel ? (
            <Button
              type="button"
              onClick={onCancel}
              variant="destructive"
              size="icon-xs"
              className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 hover:bg-red-650 text-white active:scale-95 transition-all duration-150 shadow-sm cursor-pointer p-0"
              title="Stop generating"
            >
              <Square size={8} fill="currentColor" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSend}
              disabled={disabled || !text.trim()}
              size="icon-xs"
              className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 cursor-pointer shadow-sm p-0 ${text.trim() && !disabled
                ? 'bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-102 active:scale-95'
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }`}
            >
              <ArrowUp size={13} strokeWidth={2.5} />
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}

