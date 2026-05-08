import { runtimeConfig } from '@/shared/config/runtimeConfig';
import { createAuthenticatedFetchClient } from './authenticatedFetch';

export const BASE_URL = runtimeConfig.identificacaoApiBaseUrl;
const authenticatedClient = createAuthenticatedFetchClient();

export function setIdentificacaoAuthTokenProvider(fn: (() => string | null) | null) {
  authenticatedClient.setAuthTokenProvider(fn);
}

export const fetchWithAuth = authenticatedClient.fetchWithAuth;

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
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`);
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPostIden<T>(path: string, body: unknown): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPutIden<T>(path: string, body: unknown): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiDeleteIden(path: string): Promise<void> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!response.ok) return handleError(response, path);
}
