import { getToken, invalidateToken, recordQuotaRemaining } from './session';

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
  current_savings: number;
  tenure_with_bank_years: number;
  marital_status?: string;
  monthly_expenses_estimate?: number;
  investment_experience_years?: number;
  risk_score?: number;
}

export interface AllocationSlice {
  category: string;
  value: number;
  weight_pct: number;
}

export interface HoldingDetail {
  instrument_id: string;
  value: number;
  name: string;
  type: string;
  risk_level: string;
}

export interface PortfolioSnapshot {
  user_id: string;
  total_value: number;
  change_amount: number;
  change_pct: number;
  allocation: AllocationSlice[];
  holdings: HoldingDetail[];
}

export interface Transaction {
  date: string;
  category: string;
  type: 'Credit' | 'Debit';
  amount: number;
  merchant: string;
  channel: string;
  balance_after: number;
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

export interface TriggerMeta {
  trigger_type: string;
  user_id: string;
  trigger_date: string;
  before: Features;
  after: Features;
}

export interface LanguageInfo {
  code: string;
  name: string;
}

export type VoiceGender = 'male' | 'female';

export interface StreamHandlers {
  onMeta?: (meta: TriggerMeta) => void;
  onTranscript?: (text: string) => void;
  onTextDelta?: (text: string) => void;
  onAudioChunk?: (base64: string, index: number) => void;
}

export interface WarmupResult {
  llm_ready: boolean;
  tts_ready: boolean;
  stt_ready: boolean;
}

class ApiError extends Error {
  status?: number;
  retryAfterSeconds?: number;

  constructor(message: string, status?: number, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function request<T>(path: string, init?: RequestInit, _retriedAfter401 = false): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...init,
    });
  } catch {
    throw new ApiError(
      `Can't reach the personalization engine — is the backend running at ${API_BASE_URL}?`,
    );
  }

  if (res.status === 401 && !_retriedAfter401) {
    // Session token expired/invalid server-side — get a fresh one and retry once.
    invalidateToken();
    return request<T>(path, init, true);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response wasn't JSON; keep statusText
    }
    const retryAfter = res.headers.get('Retry-After');
    throw new ApiError(detail, res.status, retryAfter ? Number(retryAfter) : undefined);
  }

  const quotaHeader = res.headers.get('X-Quota-Remaining-Seconds');
  if (quotaHeader) recordQuotaRemaining(Number(quotaHeader));

  return res.json() as Promise<T>;
}

/**
 * Wraps a GPU-gated call (chat, triggers): the backend returns 503 with
 * Retry-After when every concurrent GPU slot is busy. Retries a few times
 * with the server-specified backoff, calling onQueued so the UI can show a
 * "busy, please wait" state instead of a hard error.
 */
async function withQueueRetry<T>(
  fn: () => Promise<T>,
  onQueued?: (attempt: number, retryAfterSeconds: number) => void,
  maxAttempts = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isQueueBusy = err instanceof ApiError && err.status === 503;
      if (!isQueueBusy || attempt === maxAttempts) throw err;
      const waitSeconds = err.retryAfterSeconds ?? 5;
      onQueued?.(attempt, waitSeconds);
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
    }
  }
  throw new ApiError('Ran out of retry attempts.');
}

/**
 * Reads a newline-delimited-JSON event stream (chat/triggers) and dispatches
 * each event to the matching handler as it arrives, instead of waiting for
 * the whole response — the caller sees text and audio incrementally.
 */
async function streamRequest(
  path: string,
  body: Record<string, unknown>,
  handlers: StreamHandlers,
  signal?: AbortSignal,
  _retriedAfter401 = false,
): Promise<void> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    throw new ApiError(
      `Can't reach the personalization engine — is the backend running at ${API_BASE_URL}?`,
    );
  }

  if (res.status === 401 && !_retriedAfter401) {
    invalidateToken();
    return streamRequest(path, body, handlers, signal, true);
  }

  if (!res.ok || !res.body) {
    let detail = res.statusText;
    try {
      const errBody = await res.json();
      detail = errBody.detail ?? detail;
    } catch {
      // response wasn't JSON; keep statusText
    }
    const retryAfter = res.headers.get('Retry-After');
    throw new ApiError(detail, res.status, retryAfter ? Number(retryAfter) : undefined);
  }

  const quotaHeader = res.headers.get('X-Quota-Remaining-Seconds');
  if (quotaHeader) recordQuotaRemaining(Number(quotaHeader));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line) continue;
        const event = JSON.parse(line);
        switch (event.type) {
          case 'transcript':
            handlers.onTranscript?.(event.text);
            break;
          case 'text_delta':
            handlers.onTextDelta?.(event.text);
            break;
          case 'audio_chunk':
            if (event.audio_base64) handlers.onAudioChunk?.(event.audio_base64, event.index);
            break;
          case 'meta':
            handlers.onMeta?.(event as TriggerMeta);
            break;
          case 'error':
            throw new ApiError(event.detail ?? 'Something went wrong.');
          case 'done':
          default:
            break;
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    throw err;
  }
}

async function streamWithQueueRetry(
  path: string,
  body: Record<string, unknown>,
  handlers: StreamHandlers,
  onQueued?: (attempt: number, retryAfterSeconds: number) => void,
  maxAttempts = 3,
  signal?: AbortSignal,
): Promise<void> {
  return withQueueRetry(() => streamRequest(path, body, handlers, signal), onQueued, maxAttempts);
}

export interface VoiceOptions {
  language?: string;
  voiceGender?: VoiceGender;
}

export const api = {
  listUsers: () => request<UserSummary[]>('/api/users'),
  getUser: (userId: string) => request<UserProfile>(`/api/users/${userId}`),
  getPortfolio: (userId: string) => request<PortfolioSnapshot>(`/api/users/${userId}/portfolio`),
  getRecommendation: (userId: string) => request<Recommendation>(`/api/users/${userId}/recommendation`),
  listLanguages: () => request<LanguageInfo[]>('/api/languages'),
  warmup: () => request<WarmupResult>('/api/warmup', { method: 'POST' }),
  streamChat: (
    userId: string,
    message: string,
    voice: VoiceOptions,
    handlers: StreamHandlers,
    onQueued?: (attempt: number, retryAfterSeconds: number) => void,
    signal?: AbortSignal,
  ) =>
    streamWithQueueRetry(
      `/api/users/${userId}/chat`,
      { message, language: voice.language ?? 'en', voice_gender: voice.voiceGender ?? 'female' },
      handlers,
      onQueued,
      3,
      signal,
    ),
  streamVoiceChat: (
    userId: string,
    audioBase64: string,
    voice: VoiceOptions,
    handlers: StreamHandlers,
    onQueued?: (attempt: number, retryAfterSeconds: number) => void,
    signal?: AbortSignal,
  ) =>
    streamWithQueueRetry(
      `/api/users/${userId}/voice-chat`,
      {
        audio_base64: audioBase64,
        language: voice.language ?? 'en',
        voice_gender: voice.voiceGender ?? 'female',
      },
      handlers,
      onQueued,
      3,
      signal,
    ),
  getTransactions: (userId: string, limit = 10) =>
    request<Transaction[]>(`/api/users/${userId}/transactions?limit=${limit}`),
  listTriggers: () => request<TriggerInfo[]>('/api/triggers'),
  streamTrigger: (
    triggerType: string,
    voice: VoiceOptions,
    handlers: StreamHandlers,
    onQueued?: (attempt: number, retryAfterSeconds: number) => void,
    signal?: AbortSignal,
  ) =>
    streamWithQueueRetry(
      `/api/triggers/${triggerType}`,
      { language: voice.language ?? 'en', voice_gender: voice.voiceGender ?? 'female' },
      handlers,
      onQueued,
      3,
      signal,
    ),
};

export { ApiError };
