export type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'error';

interface ConnectButtonProps {
  status: ConnectionStatus;
  detail?: string;
  onConnect: () => void;
}

const DOT_CLASS: Record<ConnectionStatus, string> = {
  idle: 'bg-paper-dim',
  connecting: 'bg-gold animate-pulse',
  ready: 'bg-emerald-400',
  error: 'bg-rose-400',
};

const LABEL: Record<ConnectionStatus, string> = {
  idle: 'Connect',
  connecting: 'Waking up Vitta...',
  ready: 'Connected',
  error: 'Retry connection',
};

export default function ConnectButton({ status, detail, onConnect }: ConnectButtonProps) {
  const clickable = status === 'idle' || status === 'error';

  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={!clickable}
      title={detail}
      className={`flex items-center gap-2 bg-ink-raised/65 border border-ink-border px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-xs font-body font-medium transition-colors duration-200 focus:outline-none ${
        clickable ? 'cursor-pointer hover:text-gold text-paper-dim' : 'cursor-default text-paper-dim'
      } ${status === 'ready' ? 'text-emerald-300' : ''} ${status === 'error' ? 'text-rose-300' : ''}`}
    >
      <span className={`w-2 h-2 rounded-full ${DOT_CLASS[status]}`} />
      {LABEL[status]}
    </button>
  );
}
