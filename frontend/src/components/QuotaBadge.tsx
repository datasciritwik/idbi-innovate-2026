interface QuotaBadgeProps {
  remainingSeconds: number;
  totalSeconds: number;
}

function formatClock(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function QuotaBadge({ remainingSeconds, totalSeconds }: QuotaBadgeProps) {
  const fraction = totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0;
  const isLow = fraction <= 0.15;

  return (
    <div
      title="Free chat time remaining today"
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-medium backdrop-blur-md transition-colors duration-300 ${
        isLow
          ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
          : 'bg-ink-raised/60 border-ink-border/40 text-paper-dim'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 flex-none">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <span>{formatClock(remainingSeconds)} left today</span>
    </div>
  );
}
