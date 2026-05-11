import { runtimeConfig } from '@/shared/config/runtimeConfig';
import { createAuthenticatedFetchClient } from './authenticatedFetch';

const BASE_URL = runtimeConfig.authzApiBaseUrl.replace(/\/$/, '');
const authenticatedClient = createAuthenticatedFetchClient();

export function setAuthzAuthTokenProvider(fn: (() => string | null) | null) {
  authenticatedClient.setAuthTokenProvider(fn);
}

async function handleError(response: Response, path: string): Promise<never> {
  const problem = await response.json().catch(() => ({
    code: String(response.status),
    message: response.statusText || 'Unexpected AuthZ API error',
    details: {},
  }));

  throw {
    ...problem,
    status: response.status,
    path,
  };
}

export async function authzGet<T>(path: string): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`);
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function authzPatch<T>(path: string, body?: unknown): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}
