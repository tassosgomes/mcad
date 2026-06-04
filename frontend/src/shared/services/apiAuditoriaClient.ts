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

export interface AuditBlobResponse {
  blob: Blob;
  filename: string | null;
  contentType: string | null;
}

export async function apiGetAuditBlob(path: string): Promise<AuditBlobResponse> {
  const response = await authenticatedClient.fetchWithAuth(`${BASE_URL}${path}`);
  if (!response.ok) return handleError(response, path);
  const blob = await response.blob();
  const contentType = response.headers.get('content-type');
  const filename = parseFilenameFromContentDisposition(response.headers.get('content-disposition'));
  return { blob, filename, contentType };
}

function parseFilenameFromContentDisposition(value: string | null): string | null {
  if (!value) return null;
  const utf8Match = value.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ''));
    } catch {
      // fall through to plain filename
    }
  }
  const plainMatch = value.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1]?.trim() ?? null;
}
