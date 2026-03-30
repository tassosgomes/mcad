const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

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
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return handleError(response, path);
  return response.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!response.ok) return handleError(response, path);
  // 204 No Content — nothing to parse
}
