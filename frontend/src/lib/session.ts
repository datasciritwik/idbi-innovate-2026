const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const STORAGE_KEY = 'vitta.session';

interface StoredSession {
  token: string;
  expiresAt: number; // epoch ms
}

interface SessionResponse {
  token: string;
  expires_in_minutes: number;
  quota_remaining_seconds: number;
  quota_total_seconds: number;
}

export interface QuotaInfo {
  remainingSeconds: number;
  totalSeconds: number;
}

let cached: StoredSession | null = null;
let pending: Promise<string> | null = null;
let lastQuota: QuotaInfo | null = null;
const quotaListeners = new Set<(quota: QuotaInfo) => void>();

function notifyQuotaListeners() {
  if (!lastQuota) return;
  for (const listener of quotaListeners) listener(lastQuota);
}

function readStorage(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.token || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(session: StoredSession) {
  cached = session;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // storage unavailable (private mode, quota) — fall back to in-memory only
  }
}

async function bootstrap(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/session`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Could not start a session (HTTP ${res.status}).`);
  }
  const body = (await res.json()) as SessionResponse;
  lastQuota = { remainingSeconds: body.quota_remaining_seconds, totalSeconds: body.quota_total_seconds };
  notifyQuotaListeners();
  writeStorage({
    token: body.token,
    // renew a little early so a request never races an almost-expired token
    expiresAt: Date.now() + (body.expires_in_minutes - 1) * 60_000,
  });
  return body.token;
}

/** Returns a valid session token, bootstrapping or renewing one as needed. */
export async function getToken(): Promise<string> {
  if (cached === null) cached = readStorage();
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  if (!pending) pending = bootstrap().finally(() => (pending = null));
  return pending;
}

/** Drops the cached token (e.g. after a 401) so the next getToken() re-bootstraps. */
export function invalidateToken() {
  cached = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getLastKnownQuota(): QuotaInfo | null {
  return lastQuota;
}

export function recordQuotaRemaining(remainingSeconds: number) {
  lastQuota = { remainingSeconds, totalSeconds: lastQuota?.totalSeconds ?? remainingSeconds };
  notifyQuotaListeners();
}

/** Subscribes to quota updates; returns an unsubscribe function. Fires
 * immediately with the last known value if one already exists. */
export function subscribeToQuota(listener: (quota: QuotaInfo) => void): () => void {
  quotaListeners.add(listener);
  if (lastQuota) listener(lastQuota);
  return () => quotaListeners.delete(listener);
}

/**
 * Makes sure quota is visible to the UI as soon as the app loads, even when
 * a still-valid token is already cached (so getToken() never re-bootstraps
 * and would otherwise leave the user's quota unknown until their first
 * chat/trigger turn). Safe to call every time — it's a no-op once quota is
 * known, and doesn't touch the cached token unless there wasn't one already.
 */
export async function ensureQuotaKnown(): Promise<void> {
  if (lastQuota) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/session`, { method: 'POST' });
    if (!res.ok) return;
    const body = (await res.json()) as SessionResponse;
    lastQuota = { remainingSeconds: body.quota_remaining_seconds, totalSeconds: body.quota_total_seconds };
    notifyQuotaListeners();
    if (!cached || cached.expiresAt <= Date.now()) {
      writeStorage({ token: body.token, expiresAt: Date.now() + (body.expires_in_minutes - 1) * 60_000 });
    }
  } catch {
    // best-effort only — the badge just stays hidden until the first turn
  }
}
