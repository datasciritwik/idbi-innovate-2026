import type { UserSummary } from '../lib/api';

interface UserSwitcherProps {
  users: UserSummary[];
  selectedUserId: string;
  onSelect: (userId: string) => void;
  disabled?: boolean;
}

export default function UserSwitcher({ users, selectedUserId, onSelect, disabled = false }: UserSwitcherProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center bg-ink-raised/65 border border-ink-border px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md">
      <select
        value={selectedUserId}
        disabled={disabled}
        onChange={(e) => onSelect(e.target.value)}
        className="bg-transparent text-xs font-body font-medium text-paper-dim focus:text-gold focus:outline-none cursor-pointer disabled:opacity-40"
      >
        {users.map((u) => (
          <option key={u.user_id} value={u.user_id} className="bg-ink-raised text-paper">
            {u.name} · {u.risk_bucket}
            {u.life_event_trigger ? ` · ${u.life_event_trigger}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
