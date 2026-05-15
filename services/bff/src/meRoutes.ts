import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { BffConfig } from './config.js';
import { type AuthorizationContextPayload, type MeCache } from './meCache.js';

interface FetchLike {
  (input: string, init?: {
    method?: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<{
    status: number;
    headers: { get(name: string): string | null };
    json(): Promise<unknown>;
  }>;
}

export interface MeRoutesOptions {
  config: BffConfig;
  cache: MeCache;
  fetchImpl?: FetchLike;
}

interface UpstreamErrorPayload {
  code?: string;
  message?: string;
  correlationId?: string;
  [key: string]: unknown;
}

interface AuthzFetchResultOk {
  ok: true;
  payload: AuthorizationContextPayload;
  version: number | undefined;
  authzVersionHeader: string | null;
}

interface AuthzFetchResultErr {
  ok: false;
  status: number;
  body: { code: string; message?: string };
}

type AuthzFetchResult = AuthzFetchResultOk | AuthzFetchResultErr;

function extractBearer(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;

  if (!header || typeof header !== 'string') {
    return undefined;
  }

  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }

  const token = trimmed.slice('bearer '.length).trim();
  return token.length > 0 ? token : undefined;
}

function sendUnauthorizedNoToken(reply: FastifyReply): void {
  reply.code(401).send({ code: 'UNAUTHORIZED' });
}

function isAuthorizationContext(value: unknown): value is AuthorizationContextPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const user = candidate.user;

  if (!user || typeof user !== 'object') return false;
  const userObj = user as Record<string, unknown>;
  if (typeof userObj.subject !== 'string') return false;

  if (!Array.isArray(candidate.permissions)) return false;
  if (typeof candidate.version !== 'number') return false;

  return true;
}

async function fetchAuthorizationContext(
  config: BffConfig,
  token: string,
  fetchImpl: FetchLike,
  log: FastifyInstance['log'],
): Promise<AuthzFetchResult | { ok: false; status: 503; body: { code: string; message?: string } }> {
  const url = `${config.authzBaseUrl}/v1/me/authorization-context`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.authzTimeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (response.status === 200) {
      const body = (await response.json()) as unknown;

      if (!isAuthorizationContext(body)) {
        log.error({ url }, 'authz returned malformed payload');
        return { ok: false, status: 503, body: { code: 'AUTHZ_UNAVAILABLE' } };
      }

      return {
        ok: true,
        payload: body,
        version: body.version,
        authzVersionHeader: response.headers.get('x-authz-version'),
      };
    }

    if (response.status === 401) {
      let upstreamCode = 'INVALID_TOKEN';
      let upstreamMessage: string | undefined;

      try {
        const errorBody = (await response.json()) as UpstreamErrorPayload | null;
        if (errorBody && typeof errorBody.code === 'string') {
          if (errorBody.code === 'SESSION_REVOKED' || errorBody.code === 'INVALID_TOKEN') {
            upstreamCode = errorBody.code;
          }
        }
        if (errorBody && typeof errorBody.message === 'string') {
          upstreamMessage = errorBody.message;
        }
      } catch {
        // ignore parse error and keep default code
      }

      return {
        ok: false,
        status: 401,
        body: { code: upstreamCode, ...(upstreamMessage ? { message: upstreamMessage } : {}) },
      };
    }

    if (response.status >= 500 || response.status === 408 || response.status === 429) {
      log.warn({ url, status: response.status }, 'authz upstream error');
      return { ok: false, status: 503, body: { code: 'AUTHZ_UNAVAILABLE' } };
    }

    // For any other unexpected status, treat as upstream unavailable.
    log.warn({ url, status: response.status }, 'authz returned unexpected status');
    return { ok: false, status: 503, body: { code: 'AUTHZ_UNAVAILABLE' } };
  } catch (error) {
    const isAbort = (error as { name?: string })?.name === 'AbortError';
    log.error(
      { url, err: error, timeout: isAbort },
      isAbort ? 'authz request timed out' : 'authz request failed',
    );
    return { ok: false, status: 503, body: { code: 'AUTHZ_UNAVAILABLE' } };
  } finally {
    clearTimeout(timer);
  }
}

async function resolveAuthorizationContext(
  request: FastifyRequest,
  reply: FastifyReply,
  options: MeRoutesOptions,
  fetchImpl: FetchLike,
): Promise<{ payload: AuthorizationContextPayload; authzVersionHeader: string | null } | undefined> {
  const token = extractBearer(request);

  if (!token) {
    sendUnauthorizedNoToken(reply);
    return undefined;
  }

  const fetchResult = await fetchAuthorizationContext(options.config, token, fetchImpl, request.log);

  if (!fetchResult.ok) {
    reply.code(fetchResult.status).send(fetchResult.body);
    return undefined;
  }

  return {
    payload: fetchResult.payload,
    authzVersionHeader: fetchResult.authzVersionHeader,
  };
}

export async function registerMeRoutes(
  server: FastifyInstance,
  options: MeRoutesOptions,
): Promise<void> {
  const { config, cache } = options;
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for me routes');
  }

  async function getContext(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<{ payload: AuthorizationContextPayload; authzVersionHeader: string | null } | undefined> {
    const token = extractBearer(request);
    if (!token) {
      sendUnauthorizedNoToken(reply);
      return undefined;
    }

    const subjectId = deriveSubjectIdFromJwt(token);

    if (subjectId) {
      const cached = cache.get(subjectId);
      if (cached) {
        return { payload: cached, authzVersionHeader: String(cached.version) };
      }
    }

    const resolved = await resolveAuthorizationContext(request, reply, options, fetchImpl);
    if (!resolved) {
      return undefined;
    }

    const cacheKey = resolved.payload.user.subject ?? subjectId;
    if (cacheKey) {
      cache.set(cacheKey, resolved.payload, config.meCacheTtlSeconds);
    }

    return resolved;
  }

  server.get('/api/me', async (request, reply) => {
    const result = await getContext(request, reply);
    if (!result) return;

    const { user } = result.payload;
    return reply.code(200).send({
      subjectId: user.subject,
      name: user.name,
      email: user.email,
    });
  });

  server.get('/api/me/permissions', async (request, reply) => {
    const result = await getContext(request, reply);
    if (!result) return;

    const { payload } = result;

    if (result.authzVersionHeader) {
      reply.header('x-authz-version', result.authzVersionHeader);
    } else {
      reply.header('x-authz-version', String(payload.version));
    }

    return reply.code(200).send({
      subjectId: payload.user.subject,
      permissions: payload.permissions,
      version: payload.version,
    });
  });
}

/**
 * Tenta extrair o `sub` do JWT sem validar assinatura. Usado apenas como
 * chave de cache local. A validacao real do token e responsabilidade do
 * ecad-authz upstream.
 */
function deriveSubjectIdFromJwt(token: string): string | undefined {
  const parts = token.split('.');
  if (parts.length < 2) return undefined;

  try {
    const payload = parts[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as { sub?: unknown };

    if (typeof parsed.sub === 'string' && parsed.sub.length > 0) {
      return parsed.sub;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
