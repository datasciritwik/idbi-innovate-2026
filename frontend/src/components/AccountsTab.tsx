import type { Transaction } from '../lib/api';

interface AccountsTabProps {
  currentSavings: number;
  transactions: Transaction[] | null;
  loading: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Insurance: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  ),
  Salary: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-18 3h18M3.75 12h16.5m-18 3h16.5M2.25 9.75a10.5 10.5 0 0 1 19.5 0v2.25a10.5 10.5 0 0 1-19.5 0v-2.25Z" />
    </svg>
  ),
  Investment: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  ),
  Shopping: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  ),
  Food: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
};

const DEFAULT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
  </svg>
);

export default function AccountsTab({ currentSavings, transactions, loading }: AccountsTabProps) {
  // Use the balance_after from the latest transaction as active balance, fallback to currentSavings
  const activeBalance = transactions && transactions.length > 0
    ? transactions[0].balance_after
    : currentSavings;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-5 gap-5">
      {/* Live Balance Section */}
      <div className="bg-ink-raised/55 border border-ink-border/50 p-5 rounded-2xl flex flex-col gap-1 backdrop-blur-md shrink-0">
        <span className="text-[10px] font-mono tracking-widest text-paper-dim/60 uppercase font-semibold">Available Balance</span>
        <h2 className="text-3xl font-extrabold text-paper font-tabular-nums tracking-tight">
          ₹{activeBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
      </div>

      {/* Transaction Log */}
      <div className="flex flex-col flex-1 min-h-0 bg-ink-raised/30 border border-ink-border/40 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-ink-border/40 bg-ink-raised/50 shrink-0">
          <h3 className="text-xs font-mono uppercase tracking-wider text-paper-dim/70 font-semibold">Recent Transactions</h3>
        </div>

        {loading ? (
          /* Loading Skeleton */
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex justify-between items-center animate-pulse gap-3">
                <div className="w-8 h-8 rounded-full bg-ink-border/40 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-ink-border/40 rounded w-1/2" />
                  <div className="h-2.5 bg-ink-border/20 rounded w-1/3" />
                </div>
                <div className="space-y-1.5 flex flex-col items-end">
                  <div className="h-3.5 bg-ink-border/40 rounded w-16" />
                  <div className="h-2.5 bg-ink-border/20 rounded w-10" />
                </div>
              </div>
            ))}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-paper-dim/50 italic p-6">
            No transactions found.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-1 divide-y divide-ink-border/20">
            {transactions.map((tx, idx) => {
              const isCredit = tx.type === 'Credit';
              const icon = CATEGORY_ICONS[tx.category] || DEFAULT_ICON;

              return (
                <div key={idx} className="flex justify-between items-center p-3.5 hover:bg-ink-raised/20 rounded-xl transition-colors duration-200 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-ink/50 border border-ink-border/40 flex items-center justify-center text-gold shrink-0">
                      {icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-paper leading-tight">{tx.merchant}</span>
                      <span className="text-[10px] text-paper-dim/60 leading-normal mt-0.5">
                        {tx.category} · {tx.channel}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className={`text-xs font-bold font-tabular-nums ${isCredit ? 'text-sage' : 'text-rose-400'}`}>
                      {isCredit ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                    </span>
                    <span className="text-[9px] text-paper-dim/40 font-mono mt-0.5">
                      {formatDate(tx.date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
