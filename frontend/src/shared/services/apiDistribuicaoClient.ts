import { runtimeConfig } from '@/shared/config/runtimeConfig';

export const BASE_URL = runtimeConfig.distribuicaoApiBaseUrl;

let getAuthToken: (() => string | null) | null = null;

export function setDistribuicaoAuthTokenProvider(fn: (() => string | null) | null) {
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

export async function apiGetDist<T>(path: string): Promise<T> {
  const response = await fetchWithAuth(`${BASE_URL}${path}`);
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}
