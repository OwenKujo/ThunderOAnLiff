const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

export class LiffApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'LiffApiError'; }
}

export async function liffRequest<T>(path: string, token: string | null, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET', headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  let payload: unknown = null;
  if (raw) { try { payload = JSON.parse(raw); } catch { payload = raw; } }
  if (!response.ok) {
    const body = payload as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new LiffApiError(message || `Request failed (${response.status})`, response.status);
  }
  return payload as T;
}

export const liffApi = {
  get: <T>(path: string, token: string) => liffRequest<T>(path, token),
  post: <T>(path: string, token: string, body?: unknown) => liffRequest<T>(path, token, { method: 'POST', body }),
  publicPost: <T>(path: string, body?: unknown) => liffRequest<T>(path, null, { method: 'POST', body }),
};
