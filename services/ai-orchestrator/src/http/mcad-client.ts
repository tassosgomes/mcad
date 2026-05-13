import { UpstreamError } from './errors.js';
import { redactSensitiveData } from '../security/redaction.js';

export interface McadClientRequest {
  baseUrl: string;
  path: string;
  accessToken: string;
  requestId: string;
  searchParams?: Record<string, string | number | boolean | undefined>;
  abortSignal?: AbortSignal;
  timeoutMs: number;
}

function buildUrl(baseUrl: string, path: string, searchParams?: McadClientRequest['searchParams']): URL {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBaseUrl);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return response.text();
  }

  return response.json() as Promise<unknown>;
}

export async function mcadGet<TResponse>(request: McadClientRequest): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
  const externalAbortHandler = () => controller.abort();

  request.abortSignal?.addEventListener('abort', externalAbortHandler, { once: true });

  try {
    const response = await fetch(buildUrl(request.baseUrl, request.path, request.searchParams), {
      method: 'GET',
      headers: {
        authorization: `Bearer ${request.accessToken}`,
        accept: 'application/json',
        'x-mcad-request-id': request.requestId,
      },
      signal: controller.signal,
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      throw new UpstreamError(response.status, JSON.stringify(redactSensitiveData(payload)));
    }

    return payload as TResponse;
  } finally {
    clearTimeout(timeout);
    request.abortSignal?.removeEventListener('abort', externalAbortHandler);
  }
}
