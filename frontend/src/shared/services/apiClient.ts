const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    const problem = await response.json().catch(() => ({
      status: response.status,
      title: response.statusText,
      detail: 'An unexpected error occurred',
      instance: path,
    }));
    throw problem;
  }
  return response.json() as Promise<T>;
}
