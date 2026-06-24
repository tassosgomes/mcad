import type { FastifyRequest } from 'fastify';
import type { BffConfig } from '../../../config/config.js';
import type { FetchLike } from '../../../shared/auth/authzContext.js';
import { toUuidCorrelationId } from '../../../shared/http/correlationId.js';
import type { AuthzFetchResult } from './permissionLifecycle.mapper.js';

export async function fetchAuthz(
  request: FastifyRequest,
  config: BffConfig,
  fetchImpl: FetchLike,
  token: string,
  path: string,
  init: { method?: string; body?: unknown; correlationId?: string } = {},
): Promise<AuthzFetchResult> {
  const url = `${config.authzBaseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.authzTimeoutMs);

  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
  };

  if (init.correlationId) {
    headers['x-correlation-id'] = toUuidCorrelationId(init.correlationId);
  }

  let reqBody: string | undefined;
  if (init.body !== undefined) {
    headers['content-type'] = 'application/json';
    reqBody = JSON.stringify(init.body);
  }

  try {
    const response = await fetchImpl(url, {
      method: init.method ?? 'GET',
      headers,
      body: reqBody,
      signal: controller.signal,
    });

    let responseBody: unknown = undefined;
    if (response.status !== 204) {
      try {
        responseBody = await response.json();
      } catch {
        responseBody = undefined;
      }
    }

    if (response.status >= 500 || response.status === 408 || response.status === 429) {
      request.log.warn({ url, status: response.status }, 'authz upstream error');
      return {
        status: 503,
        body: { code: 'AUTHZ_SERVICE_UNAVAILABLE' },
        headers: response.headers,
      };
    }

    return { status: response.status, body: responseBody, headers: response.headers };
  } catch (error) {
    const isAbort = (error as { name?: string })?.name === 'AbortError';
    request.log.error(
      { url, err: error, timeout: isAbort },
      isAbort ? 'authz request timed out' : 'authz request failed',
    );
    return {
      status: 503,
      body: { code: 'AUTHZ_SERVICE_UNAVAILABLE' },
      headers: { get: () => null },
    };
  } finally {
    clearTimeout(timer);
  }
}
