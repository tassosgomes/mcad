import { runtimeConfig } from '@/shared/config/runtimeConfig';

const BASE_URL = runtimeConfig.cadastroApiBaseUrl;

let getAuthToken: (() => string | null) | null = null;

export function setAuthTokenProvider(fn: (() => string | null) | null) {
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

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetchWithAuth(`${BASE_URL}${path}`);
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetchWithAuth(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!response.ok) return handleError(response, path);
  // 204 No Content — nothing to parse
}

export async function apiDeleteWithBody<T>(path: string): Promise<T> {
  const response = await fetchWithAuth(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}
