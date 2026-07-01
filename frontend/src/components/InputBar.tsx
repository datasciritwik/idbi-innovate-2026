import React, { useState } from 'react';

interface InputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function InputBar({ onSend, disabled = false }: InputBarProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center w-full">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder="Ask Wren about your wealth..."
        className="w-full bg-ink-raised/55 text-paper text-[12px] px-4.5 py-3 pr-12 rounded-full border border-ink-border focus:border-gold/60 focus:shadow-[0_0_12px_rgba(212,175,106,0.06)] focus:outline-none placeholder:text-paper-dim/40 transition-all duration-300 font-body disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="absolute right-2.5 p-1.5 text-gold hover:text-paper transition-colors duration-200 disabled:opacity-30 cursor-pointer focus:outline-none"
        aria-label="Send message"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={2.5} 
          stroke="currentColor" 
          className="w-4 h-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
        </svg>
      </button>
    </form>
  );
}
