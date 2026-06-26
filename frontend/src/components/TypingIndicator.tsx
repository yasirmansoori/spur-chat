export default function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 max-w-40 shadow-sm select-none">
      <div className="flex space-x-1 items-center">
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
      </div>
    </div>
  );
}
