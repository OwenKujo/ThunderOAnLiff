const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string | null;
  anonymous?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token: explicitToken, anonymous = false, body, ...requestInit } = options;
  const headers = new Headers(requestInit.headers);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const token = explicitToken !== undefined ? explicitToken : (anonymous ? null : sessionStorage.getItem('thunder.admin.token'));
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: requestInit.signal ?? AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try { payload = JSON.parse(raw); } catch { payload = raw; }
  }
  if (!response.ok) {
    const body = payload as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    if (response.status === 401 && !anonymous) {
      sessionStorage.removeItem('thunder.admin.token');
      sessionStorage.removeItem('thunder.admin.profile');
      window.dispatchEvent(new Event('thunder:session-expired'));
    }
    throw new ApiError(message || `Request failed (${response.status})`, response.status);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => apiRequest<T>(path, { method: 'GET', token }),
  post: <T>(path: string, body?: unknown, token?: string | null) => apiRequest<T>(path, { method: 'POST', body, token, anonymous: token === null }),
  patch: <T>(path: string, body?: unknown, token?: string | null) => apiRequest<T>(path, { method: 'PATCH', body, token }),
};
