import type { FastifyReply, FastifyRequest } from 'fastify';
import type { BffConfig } from '../../config/config.js';
import {
  deriveSubjectIdFromJwt,
  extractBearer,
  type FetchLike,
  resolveAuthzContext,
  sendError,
  type ResolvedAuthzContext,
} from '../../shared/auth/authzContext.js';
import type { AuthorizationContextPayload, MeCache } from '../../shared/auth/meCache.js';

export interface MeServiceOptions {
  config: BffConfig;
  cache: MeCache;
  fetchImpl: FetchLike;
}

export interface MeContextResult {
  payload: AuthorizationContextPayload;
  authzVersionHeader: string | null;
}

export interface MeProfileResponse {
  subjectId: string;
  name?: string;
  email?: string;
  roles: string[];
  primaryRole: string | null;
}

export interface MePermissionsResponse {
  subjectId: string;
  permissions: string[];
  version: number;
}

function cacheResolvedContext(
  resolved: ResolvedAuthzContext,
  subjectId: string | undefined,
  options: MeServiceOptions,
): void {
  const cacheKey = resolved.payload.user.subject ?? subjectId;

  if (cacheKey) {
    options.cache.set(cacheKey, resolved.payload, options.config.meCacheTtlSeconds);
  }
}

export async function resolveMeContext(
  request: FastifyRequest,
  reply: FastifyReply,
  options: MeServiceOptions,
): Promise<MeContextResult | undefined> {
  const token = extractBearer(request);
  if (!token) {
    sendError(reply, 401, 'UNAUTHORIZED');
    return undefined;
  }

  const subjectId = deriveSubjectIdFromJwt(token);

  if (subjectId) {
    const cached = options.cache.get(subjectId);
    if (cached) {
      return { payload: cached, authzVersionHeader: String(cached.version) };
    }
  }

  const resolved = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!resolved) {
    return undefined;
  }

  cacheResolvedContext(resolved, subjectId, options);

  return resolved;
}

export function buildMeProfile(payload: AuthorizationContextPayload): MeProfileResponse {
  const { user } = payload;

  return {
    subjectId: user.subject,
    name: user.name,
    email: user.email,
    roles: payload.roles,
    primaryRole: payload.roles[0] ?? null,
  };
}

export function buildMePermissions(payload: AuthorizationContextPayload): MePermissionsResponse {
  return {
    subjectId: payload.user.subject,
    permissions: payload.permissions,
    version: payload.version,
  };
}
