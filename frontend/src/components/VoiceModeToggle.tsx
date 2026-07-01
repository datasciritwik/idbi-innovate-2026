interface VoiceModeToggleProps {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export default function VoiceModeToggle({ active, disabled = false, onToggle }: VoiceModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={active ? 'Turn off voice mode' : 'Turn on voice mode (mic + auto-listen)'}
      className={`flex items-center gap-2 border px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-xs font-body font-medium transition-colors duration-200 cursor-pointer focus:outline-none disabled:opacity-40 disabled:cursor-default ${
        active
          ? 'bg-gold/20 border-gold text-gold'
          : 'bg-ink-raised/65 border-ink-border text-paper-dim hover:text-gold'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />}
      {active ? 'Listening' : 'Voice mode'}
    </button>
  );
}
