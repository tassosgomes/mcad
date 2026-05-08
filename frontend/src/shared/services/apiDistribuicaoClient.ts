import { runtimeConfig } from '@/shared/config/runtimeConfig';
import { createAuthenticatedFetchClient } from './authenticatedFetch';

export const BASE_URL = runtimeConfig.distribuicaoApiBaseUrl;
const authenticatedClient = createAuthenticatedFetchClient();

export function setDistribuicaoAuthTokenProvider(fn: (() => string | null) | null) {
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

export async function apiGetDist<T>(path: string): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`);
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPostDist<T>(path: string, body?: unknown): Promise<T> {
  const headers = new Headers();
  const init: RequestInit = {
    method: 'POST',
    headers,
  };

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }

  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, init);
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}
