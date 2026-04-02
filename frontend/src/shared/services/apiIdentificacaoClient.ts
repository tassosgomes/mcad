const BASE_URL = import.meta.env.VITE_IDENTIFICACAO_API_BASE_URL || 'http://localhost:5100/api/v1';

let getAuthToken: (() => string | null) | null = null;

export function setIdentificacaoAuthTokenProvider(fn: (() => string | null) | null) {
  getAuthToken = fn;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken?.();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function handleError(response: Response, path: string): Promise<never> {
  const problem = await response.json().catch(() => ({
    status: response.status,
    title: response.statusText,
    detail: 'An unexpected error occurred',
    instance: path,
  }));
  throw problem;
}

export async function apiGetIden<T>(path: string): Promise<T> {
  const response = await fetchWithAuth(`${BASE_URL}${path}`);
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPostIden<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPutIden<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiDeleteIden(path: string): Promise<void> {
  const response = await fetchWithAuth(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!response.ok) return handleError(response, path);
}
