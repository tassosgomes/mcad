import { runtimeConfig } from '@/shared/config/runtimeConfig';
import { createAuthenticatedFetchClient } from './authenticatedFetch';

const BASE_URL = runtimeConfig.cadastroApiBaseUrl;
const authenticatedClient = createAuthenticatedFetchClient();

export function setAuthTokenProvider(fn: (() => string | null) | null) {
  authenticatedClient.setAuthTokenProvider(fn);
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
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`);
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!response.ok) return handleError(response, path);
  // 204 No Content — nothing to parse
}

export async function apiDeleteWithBody<T>(path: string): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}
