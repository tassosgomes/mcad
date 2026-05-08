import { runtimeConfig } from '@/shared/config/runtimeConfig';
import { createAuthenticatedFetchClient } from './authenticatedFetch';

export const BASE_URL = runtimeConfig.auditoriaApiBaseUrl;
const authenticatedClient = createAuthenticatedFetchClient();

export function setAuditoriaAuthTokenProvider(fn: (() => string | null) | null) {
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

export async function apiGetAudit<T>(path: string): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`);
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPostAudit<T>(path: string, body: unknown): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}
