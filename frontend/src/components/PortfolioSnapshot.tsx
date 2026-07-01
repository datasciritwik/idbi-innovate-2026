import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AllocationSlice } from '../lib/api';

const GOLD_SHADES = ['bg-gold', 'bg-gold/70', 'bg-gold/40', 'bg-gold/20'];

interface PortfolioSnapshotProps {
  defaultExpanded?: boolean;
  totalValue: number;
  changeAmount: number;
  changePct: number;
  allocation: AllocationSlice[];
  loading?: boolean;
}

const currency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function PortfolioSnapshot({
  defaultExpanded = false,
  totalValue,
  changeAmount,
  changePct,
  allocation,
  loading = false,
}: PortfolioSnapshotProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Sync state with parent-triggered default changes (e.g. tablet mode auto-expansion)
  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const isPositive = changeAmount >= 0;
  const changeColorClass = isPositive ? 'text-sage' : 'text-danger';

  return (
    <div className="relative overflow-hidden bg-ink-raised border border-ink-border rounded-2xl shadow-md select-none transition-all duration-300">
      {/* Diagonal Gold Accent Stripe */}
      <div className="absolute top-0 right-0 w-10 h-10 overflow-hidden pointer-events-none">
        <div className="absolute w-16 h-[1px] bg-gold top-2 right-[-20px] rotate-45 opacity-40 shadow-[0_0_6px_var(--color-gold)]" />
      </div>

      {/* Main Strip (Tappable Header) */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3.5 focus:outline-none cursor-pointer text-left group"
      >
        <div className="flex flex-col">
          <span className="font-body text-[8.5px] tracking-widest text-paper-dim uppercase font-semibold">
            Portfolio Value
          </span>
          {loading ? (
            <div className="h-4 w-32 mt-1.5 rounded bg-ink-border/50 animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-tabular-nums text-base font-semibold text-paper group-hover:text-gold transition-colors duration-200">
                {currency(totalValue)}
              </span>
              <span className={`font-tabular-nums text-xs font-semibold ${changeColorClass}`}>
                {isPositive ? '+' : ''}
                {currency(changeAmount)} ({isPositive ? '+' : ''}
                {changePct.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* Expand/Collapse Chevron */}
        <div className="p-1 text-paper-dim/60 group-hover:text-gold transition-colors duration-200">
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-3.5 h-3.5"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </motion.svg>
        </div>
      </button>

      {/* Expandable Asset Allocation Panel */}
      <AnimatePresence initial={false}>
        {isExpanded && !loading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1.5 border-t border-ink-border/40 space-y-3">
              <div className="flex justify-between font-body text-[8.5px] tracking-wider text-paper-dim uppercase font-medium">
                <span>Asset Class</span>
                <span>Allocation</span>
              </div>

              <div className="space-y-2.5">
                {allocation.map((item, index) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between font-body text-[11px] text-paper-dim">
                      <span className="font-medium text-paper/85">{item.category}</span>
                      <span className="font-tabular-nums">{item.weight_pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-[2px] bg-ink/65 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${GOLD_SHADES[index % GOLD_SHADES.length]}`}
                        style={{ width: `${item.weight_pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
