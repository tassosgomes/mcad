import type { FastifyBaseLogger } from 'fastify';
import type { FetchLike } from '../auth/authzContext.js';

export interface FetchJsonResult {
  status: number;
  body?: unknown;
  headers: { get(name: string): string | null };
}

export async function fetchJsonWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs: number;
    log: FastifyBaseLogger;
    upstreamName: string;
  },
): Promise<FetchJsonResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: init.method ?? 'GET',
      headers: init.headers,
      body: init.body,
      signal: controller.signal,
    });

    let body: unknown;
    try {
      body = response.status === 204 ? undefined : await response.json();
    } catch {
      body = undefined;
    }

    return {
      status: response.status,
      body,
      headers: response.headers,
    };
  } catch (error) {
    const isAbort = (error as { name?: string })?.name === 'AbortError';
    init.log.error(
      { url, err: error, timeout: isAbort },
      isAbort ? `${init.upstreamName} request timed out` : `${init.upstreamName} request failed`,
    );
    return {
      status: 503,
      body: undefined,
      headers: { get: () => null },
    };
  } finally {
    clearTimeout(timer);
  }
}
