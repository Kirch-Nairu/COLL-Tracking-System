export class ApiError extends Error {
  status: number;
  code: string;
  data: unknown;

  constructor(status: number, code: string, data: unknown) {
    super(code);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export function getToken() {
  return localStorage.getItem('coll.session');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('coll.session', token);
  else localStorage.removeItem('coll.session');
}

function authHeaders(init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...init, headers: authHeaders(init) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) setToken(null);
    const code = typeof data?.error === 'string' ? data.error : `HTTP_${response.status}`;
    throw new ApiError(response.status, code, data);
  }
  return data as T;
}

export async function downloadApiFile(path: string, filename: string) {
  const response = await fetch(path, { headers: authHeaders() });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, typeof data?.error === 'string' ? data.error : `HTTP_${response.status}`, data);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
