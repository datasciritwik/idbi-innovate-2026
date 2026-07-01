interface QuickActionsProps {
  onActionClick: (actionId: string) => void;
  disabled?: boolean;
}

export default function QuickActions({ onActionClick, disabled = false }: QuickActionsProps) {
  const actions = [
    { label: "Got a raise 🎉", id: "raise" },
    { label: "Unexpected medical expense", id: "medical" },
    { label: "Can I afford this?", id: "afford" },
  ];

  return (
    <div className="flex gap-2 py-1 overflow-x-auto select-none no-scrollbar whitespace-nowrap scrollbar-none">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => !disabled && onActionClick(action.id)}
          disabled={disabled}
          className="flex-none font-body text-[11px] font-medium px-3.5 py-1.5 rounded-full border bg-ink-raised/40 border-ink-border text-paper-dim hover:text-gold hover:border-gold hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_10px_rgba(212,175,106,0.1)] focus:outline-none focus:border-gold"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
