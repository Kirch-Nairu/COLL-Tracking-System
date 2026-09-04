const TOKEN_KEY = "coll.session.token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");

  const token = getToken();
  if (token) headers.set("authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...init, headers });
  if (response.status === 204) return undefined as T;

  const body = await response.json() as T & { error?: string };
  if (!response.ok) {
    throw Object.assign(new Error(body.error || `HTTP_${response.status}`), {
      status: response.status,
      body
    });
  }

  return body;
}
