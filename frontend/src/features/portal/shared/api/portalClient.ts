import { runtimeConfig } from '@/shared/config/runtimeConfig';
import { createAuthenticatedFetchClient } from '@services/authenticatedFetch';
import { getPortalToken } from '../auth/portalToken';

const authenticatedClient = createAuthenticatedFetchClient(async () => {
  return getPortalToken();
});

async function handleError(response: Response, path: string): Promise<never> {
  const problem = await response.json().catch(() => ({
    status: response.status,
    title: response.statusText,
    detail: 'An unexpected error occurred',
    instance: path,
  }));
  throw problem;
}

export async function portalGet<T>(path: string): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(
    `${runtimeConfig.portalApiBaseUrl}${path}`,
  );
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function portalPost<T>(path: string, body: unknown): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(
    `${runtimeConfig.portalApiBaseUrl}${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function portalPut<T>(path: string, body: unknown): Promise<T> {
  const response = await authenticatedClient.fetchWithAuth(
    `${runtimeConfig.portalApiBaseUrl}${path}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}
