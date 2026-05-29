import { runtimeConfig } from '@shared/config/runtimeConfig';
import { createAuthenticatedFetchClient } from './authenticatedFetch';

const authenticatedClient = createAuthenticatedFetchClient();

function resolveBffOrigin(): string {
  const authzUrl = runtimeConfig.authzApiBaseUrl;
  if (!authzUrl || authzUrl.startsWith('/')) {
    return '';
  }

  try {
    return new URL(authzUrl).origin;
  } catch {
    return '';
  }
}

const BASE_URL = `${resolveBffOrigin()}/api`;

export function setBffAuthTokenProvider(fn: (() => string | null) | null) {
  authenticatedClient.setAuthTokenProvider(fn);
}

async function handleError(response: Response, path: string): Promise<never> {
  const problem = await response.json().catch(() => ({
    code: String(response.status),
    message: response.statusText || 'Erro inesperado no BFF',
  }));

  throw {
    ...problem,
    status: response.status,
    path,
  };
}

export async function bffGet<T>(path: string): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`);
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function bffPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) return handleError(response, path);

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function bffDelete<T = void>(path: string): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'DELETE',
  });

  if (!response.ok) return handleError(response, path);

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
