import type { UserProfile, Recommendation } from '../lib/api';

interface GoalsTabProps {
  userProfile: UserProfile | null;
  recommendation: Recommendation | null;
  loading: boolean;
}

export default function GoalsTab({ userProfile, recommendation, loading }: GoalsTabProps) {
  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const risk = userProfile?.risk_bucket || recommendation?.risk_bucket || 'Moderate';
  const riskBadgeClass =
    risk === 'Aggressive' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' :
    risk === 'Conservative' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
    'bg-gold/10 text-gold border-gold/20';

  return (
    <div className="flex flex-col h-full overflow-hidden p-5 gap-5">
      
      {/* Risk Profile & Financial Goals Card */}
      <div className="bg-ink-raised/55 border border-ink-border/50 p-4.5 rounded-2xl flex flex-col gap-3.5 backdrop-blur-md shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono tracking-widest text-paper-dim/60 uppercase font-semibold">Risk Appetite</span>
          {loading && !userProfile ? (
            <div className="h-4 w-16 rounded bg-ink-border/40 animate-pulse" />
          ) : (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${riskBadgeClass}`}>
              {risk} Risk
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono tracking-widest text-paper-dim/40 uppercase">Target Goals</span>
          {loading && !userProfile ? (
            <div className="flex gap-2">
              <div className="h-6 w-20 rounded-full bg-ink-border/40 animate-pulse" />
              <div className="h-6 w-24 rounded-full bg-ink-border/40 animate-pulse" />
            </div>
          ) : !userProfile?.financial_goals || userProfile.financial_goals.length === 0 ? (
            <span className="text-xs text-paper-dim/50 italic">No goals defined.</span>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {userProfile.financial_goals.map((g, idx) => (
                <span
                  key={idx}
                  className="text-[10.5px] font-semibold font-body bg-ink-raised/80 border border-ink-border px-3 py-1 rounded-full text-paper hover:text-gold hover:border-gold/30 transition-all duration-300"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Advisory & Recommendations Summary Card */}
      <div className="flex flex-col flex-1 min-h-0 bg-ink-raised/30 border border-ink-border/40 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-ink-border/40 bg-ink-raised/50 shrink-0">
          <h3 className="text-xs font-mono uppercase tracking-wider text-paper-dim/70 font-semibold">AI Investment Advisory</h3>
        </div>

        {loading || !recommendation ? (
          /* Loading skeleton */
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            <div className="space-y-1">
              <div className="h-3 w-32 bg-ink-border/40 rounded animate-pulse" />
              <div className="h-6 w-24 bg-ink-border/40 rounded animate-pulse" />
            </div>
            <div className="space-y-2 pt-3 border-t border-ink-border/20">
              <div className="h-4 bg-ink-border/40 rounded w-1/2" />
              <div className="h-3 bg-ink-border/20 rounded w-3/4" />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            
            {/* Deployable Surplus */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono tracking-widest text-paper-dim/50 uppercase">Recommended Monthly SIP</span>
              <h4 className="text-2xl font-extrabold text-gold font-tabular-nums tracking-tight">
                {formatCurrency(recommendation.monthly_deployable)}
              </h4>
              <span className="text-[10.5px] text-paper-dim/60 leading-normal">
                Based on surplus cashflow after liquid buffer allocations.
              </span>
            </div>

            {/* Top Allocations */}
            {recommendation.recommended_allocations && recommendation.recommended_allocations.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-ink-border/20">
                <span className="text-[10px] font-mono tracking-widest text-paper-dim/40 uppercase block mb-1">Top Suggestions</span>
                
                {recommendation.recommended_allocations.slice(0, 2).map((alloc, idx) => (
                  <div
                    key={alloc.instrument_id || idx}
                    className="p-3 bg-ink-raised/40 border border-ink-border/40 rounded-xl space-y-1.5 hover:border-gold/25 transition-all duration-300"
                  >
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-xs font-bold text-paper leading-tight">{alloc.name}</span>
                      <span className="text-xs font-extrabold text-gold font-tabular-nums shrink-0">
                        {formatCurrency(alloc.monthly_amount)}/mo
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9.5px] text-paper-dim/50 font-medium">
                      <span>{alloc.type}</span>
                    </div>
                    <p className="text-[10.5px] text-paper-dim/75 leading-relaxed pt-1 border-t border-ink-border/10 italic">
                      "{alloc.rationale}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile Context Footer */}
      {userProfile && (
        <div className="bg-ink/30 border border-ink-border/20 px-3.5 py-2.5 rounded-xl text-center shrink-0">
          <p className="text-[10px] text-paper-dim/60 font-medium font-body leading-normal">
            Profile: {userProfile.age} yrs · {userProfile.occupation} · {userProfile.tenure_with_bank_years} yrs with bank
          </p>
        </div>
      )}
    </div>
  );
}
