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

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(path, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) setToken(null);
    const code = typeof data?.error === 'string' ? data.error : `HTTP_${response.status}`;
    throw new ApiError(response.status, code, data);
  }
  return data as T;
}
