const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export interface UserSummary {
  user_id: string;
  name: string;
  city: string;
  risk_bucket: string;
  life_event_trigger: string | null;
}

export interface Features {
  monthly_income_avg: number;
  monthly_expense_avg: number;
  monthly_sip_avg: number;
  surplus_before_sip: number;
  disposable_after_sip: number;
  cashflow_trend: string;
  top_spend_categories: { category: string; monthly_avg: number }[];
  months_covered: number;
}

export interface UserProfile extends UserSummary {
  age: number;
  occupation: string;
  monthly_income: number;
  financial_goals: string[];
  dependents: number;
  existing_holdings: Record<string, number>;
  features: Features;
}

export interface AllocationSlice {
  category: string;
  value: number;
  weight_pct: number;
}

export interface PortfolioSnapshot {
  user_id: string;
  total_value: number;
  change_amount: number;
  change_pct: number;
  allocation: AllocationSlice[];
}

export interface RecommendedAllocation {
  instrument_id: string;
  name: string;
  type: string;
  monthly_amount: number;
  rationale: string;
}

export interface Recommendation {
  user_id: string;
  risk_bucket: string;
  monthly_disposable_surplus: number;
  monthly_deployable: number;
  recommended_allocations: RecommendedAllocation[];
  liquid_buffer: number;
}

export interface TriggerInfo {
  trigger_type: string;
  user_id: string;
}

export interface TriggerResult {
  trigger_type: string;
  user_id: string;
  trigger_date: string;
  before: Features;
  after: Features;
  reply: string;
}

class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError(
      `Can't reach the personalization engine — is the backend running at ${API_BASE_URL}?`,
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response wasn't JSON; keep statusText
    }
    throw new ApiError(detail, res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  listUsers: () => request<UserSummary[]>('/api/users'),
  getUser: (userId: string) => request<UserProfile>(`/api/users/${userId}`),
  getPortfolio: (userId: string) => request<PortfolioSnapshot>(`/api/users/${userId}/portfolio`),
  getRecommendation: (userId: string) => request<Recommendation>(`/api/users/${userId}/recommendation`),
  sendChat: (userId: string, message: string) =>
    request<{ reply: string }>(`/api/users/${userId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  listTriggers: () => request<TriggerInfo[]>('/api/triggers'),
  fireTrigger: (triggerType: string) =>
    request<TriggerResult>(`/api/triggers/${triggerType}`, { method: 'POST' }),
};

export { ApiError };
