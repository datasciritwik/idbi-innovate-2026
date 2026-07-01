import type { PortfolioSnapshot } from '../lib/api';

interface InvestTabProps {
  portfolio: PortfolioSnapshot | null;
  loading: boolean;
}

export default function InvestTab({ portfolio, loading }: InvestTabProps) {
  const isPositive = portfolio ? portfolio.change_amount >= 0 : true;
  const changeColorClass = isPositive ? 'text-sage' : 'text-danger';

  // Sort holdings by value descending
  const sortedHoldings = portfolio?.holdings
    ? [...portfolio.holdings].sort((a, b) => b.value - a.value)
    : [];

  const formatCurrency = (val: number, decimals = 0) => {
    return `₹${val.toLocaleString('en-IN', {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })}`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-5 gap-5">
      {/* Portfolio Value Summary Header Card */}
      <div className="bg-ink-raised/55 border border-ink-border/50 p-5 rounded-2xl flex flex-col gap-1 backdrop-blur-md shrink-0 relative">
        <div className="absolute top-0 right-0 w-10 h-10 overflow-hidden pointer-events-none">
          <div className="absolute w-16 h-[1px] bg-gold top-2 right-[-20px] rotate-45 opacity-40 shadow-[0_0_6px_var(--color-gold)]" />
        </div>

        <span className="text-[10px] font-mono tracking-widest text-paper-dim/60 uppercase font-semibold">Total Portfolio Value</span>
        
        {loading || !portfolio ? (
          <div className="h-8 w-48 mt-1.5 rounded bg-ink-border/50 animate-pulse" />
        ) : (
          <div className="flex items-baseline flex-wrap gap-2 mt-0.5">
            <span className="text-3xl font-extrabold text-paper font-tabular-nums tracking-tight">
              {formatCurrency(portfolio.total_value)}
            </span>
            <span className={`text-xs font-semibold font-tabular-nums ${changeColorClass} ml-1`}>
              {isPositive ? '+' : ''}
              {formatCurrency(portfolio.change_amount)} ({isPositive ? '+' : ''}
              {portfolio.change_pct.toFixed(2)}%) today
            </span>
          </div>
        )}
      </div>

      {/* Asset Holdings breakdown list */}
      <div className="flex flex-col flex-1 min-h-0 bg-ink-raised/30 border border-ink-border/40 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-ink-border/40 bg-ink-raised/50 shrink-0">
          <h3 className="text-xs font-mono uppercase tracking-wider text-paper-dim/70 font-semibold">Asset Holdings</h3>
        </div>

        {loading ? (
          /* Loading skeleton */
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex justify-between items-center animate-pulse gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-ink-border/40 rounded w-2/3" />
                  <div className="h-3.5 bg-ink-border/20 rounded w-1/4" />
                </div>
                <div className="h-4 bg-ink-border/40 rounded w-24" />
              </div>
            ))}
          </div>
        ) : sortedHoldings.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-paper-dim/50 italic p-6">
            No holdings found.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-1 divide-y divide-ink-border/20">
            {sortedHoldings.map((holding) => {
              const risk = holding.risk_level;
              const riskColorClass =
                risk === 'High' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' :
                risk === 'Medium' || risk === 'Moderate' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';

              return (
                <div
                  key={holding.instrument_id}
                  className="flex justify-between items-center p-3.5 hover:bg-ink-raised/20 rounded-xl transition-colors duration-200 gap-3"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-xs font-semibold text-paper leading-tight">{holding.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-paper-dim/60 font-medium">{holding.type}</span>
                      <span className="w-1 h-1 rounded-full bg-ink-border" />
                      <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${riskColorClass}`}>
                        {risk} Risk
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-paper font-tabular-nums text-right shrink-0">
                    {formatCurrency(holding.value, 2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
