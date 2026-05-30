import type { FastifyRequest } from 'fastify';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AiOrchestratorConfig } from '../config/env.js';
import { ForbiddenError, HttpProblemError, UnauthorizedError } from './errors.js';
import {
  createRuntimeContext,
  runtimeContextToObject,
  type McadRuntimeContext,
  type ResolvedRuntimeAuthorization,
} from '../schemas/runtime-context.js';

interface JwtPayload {
  sub?: string;
  name?: string;
  preferred_username?: string;
}

interface AuthzContextPayload {
  user?: {
    id?: unknown;
    subject?: unknown;
    name?: unknown;
  };
  permissions: string[];
  version: number;
}

const RUNTIME_AUTH_MAX_SKEW_MS = 60_000;
const RUNTIME_AUTH_SIGNATURE_HEADER = 'x-mcad-runtime-auth-signature';
const RUNTIME_AUTH_TIMESTAMP_HEADER = 'x-mcad-runtime-auth-timestamp';

function splitHeaderList(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  const joinedValue = Array.isArray(value) ? value.join(',') : value;

  return joinedValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function decodeJwtPayload(accessToken: string): JwtPayload {
  const [, payload] = accessToken.split('.');

  if (!payload) {
    return {};
  }

  try {
    const decodedPayload = Buffer.from(payload, 'base64url').toString('utf8');
    const parsedPayload = JSON.parse(decodedPayload) as unknown;

    if (parsedPayload && typeof parsedPayload === 'object') {
      return parsedPayload as JwtPayload;
    }
  } catch {
    return {};
  }

  return {};
}

function getBearerToken(authorizationHeader: string | string[] | undefined): string {
  const authorization = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;

  if (!authorization?.startsWith('Bearer ')) {
    throw new UnauthorizedError('A Bearer token is required.');
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    throw new UnauthorizedError('A non-empty Bearer token is required.');
  }

  return token;
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseAuthzVersion(value: string | string[] | undefined): number | undefined {
  const rawValue = firstHeaderValue(value);

  if (!rawValue?.trim()) {
    return undefined;
  }

  const parsedValue = Number(rawValue);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : undefined;
}

function parseTimestamp(value: string | string[] | undefined): number | undefined {
  const rawValue = firstHeaderValue(value);

  if (!rawValue?.trim()) {
    return undefined;
  }

  const parsedValue = Number(rawValue);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

function buildRuntimeAuthSignatureInput(
  authorization: ResolvedRuntimeAuthorization,
  requestId: string,
  timestamp: number,
): string {
  return JSON.stringify({
    requestId,
    userId: authorization.userId,
    displayName: authorization.displayName ?? '',
    permissions: authorization.permissions,
    authzVersion: authorization.authzVersion,
    timestamp,
  });
}

function signRuntimeAuthorization(
  authorization: ResolvedRuntimeAuthorization,
  requestId: string,
  timestamp: number,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(buildRuntimeAuthSignatureInput(authorization, requestId, timestamp))
    .digest('base64url');
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function assertSignedRuntimeAuthorization(
  authorization: ResolvedRuntimeAuthorization,
  request: FastifyRequest,
  config: AiOrchestratorConfig,
): void {
  if (!config.runtimeAuthSecret) {
    throw new ForbiddenError('Signed resolved authorization context is required.');
  }

  const timestamp = parseTimestamp(request.headers[RUNTIME_AUTH_TIMESTAMP_HEADER]);
  const signature = firstHeaderValue(request.headers[RUNTIME_AUTH_SIGNATURE_HEADER]);

  if (!timestamp || !signature?.trim()) {
    throw new ForbiddenError('Signed resolved authorization context is required.');
  }

  if (Math.abs(Date.now() - timestamp) > RUNTIME_AUTH_MAX_SKEW_MS) {
    throw new ForbiddenError('Resolved authorization context signature is expired.');
  }

  const expectedSignature = signRuntimeAuthorization(
    authorization,
    request.id,
    timestamp,
    config.runtimeAuthSecret,
  );

  if (!signaturesMatch(expectedSignature, signature)) {
    throw new ForbiddenError('Resolved authorization context signature is invalid.');
  }
}

function getRequiredUserId(
  request: FastifyRequest,
  jwtPayload: JwtPayload,
  fallback?: string,
): string {
  const userId =
    firstHeaderValue(request.headers['x-mcad-user-id']) ??
    fallback ??
    jwtPayload.sub;

  if (!userId?.trim()) {
    throw new UnauthorizedError('A resolved authorization context must include userId.');
  }

  return userId;
}

function getDisplayName(request: FastifyRequest, jwtPayload: JwtPayload, fallback?: string): string | undefined {
  return (
    firstHeaderValue(request.headers['x-mcad-user-name']) ??
    fallback ??
    jwtPayload.name ??
    jwtPayload.preferred_username
  );
}

function resolveAuthorizationFromHeaders(
  request: FastifyRequest,
  jwtPayload: JwtPayload,
  config: AiOrchestratorConfig,
): ResolvedRuntimeAuthorization | undefined {
  const bffUpstream = firstHeaderValue(request.headers['x-mcad-bff-upstream']);
  const permissions = splitHeaderList(request.headers['x-mcad-permissions']);
  const authzVersion =
    parseAuthzVersion(request.headers['x-mcad-authz-version']) ??
    parseAuthzVersion(request.headers['x-authz-version']);

  if (bffUpstream !== 'ai') {
    return undefined;
  }

  if (permissions.length === 0 && authzVersion === undefined) {
    return undefined;
  }

  if (authzVersion === undefined) {
    throw new ForbiddenError('Resolved authorization context must include authzVersion.');
  }

  const resolvedAuthorization = {
    userId: getRequiredUserId(request, jwtPayload),
    displayName: getDisplayName(request, jwtPayload),
    permissions,
    authzVersion,
  };

  assertSignedRuntimeAuthorization(resolvedAuthorization, request, config);

  return resolvedAuthorization;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function toAuthzContextPayload(value: unknown): AuthzContextPayload | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as AuthzContextPayload;
  if (!isStringArray(candidate.permissions) || typeof candidate.version !== 'number') {
    return undefined;
  }

  return candidate;
}

async function fetchResolvedAuthorization(
  accessToken: string,
  jwtPayload: JwtPayload,
  config: AiOrchestratorConfig,
): Promise<ResolvedRuntimeAuthorization> {
  const authzBaseUrl = config.upstreams.authzBaseUrl.replace(/\/$/, '');
  let response: Response;

  try {
    response = await fetch(`${authzBaseUrl}/me/authorization-context`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
      },
    });
  } catch {
    throw new HttpProblemError(503, 'Authorization Unavailable', 'Unable to resolve authorization context.');
  }

  if (response.status === 401) {
    throw new UnauthorizedError('Authorization context rejected the access token.');
  }

  if (response.status !== 200) {
    throw new HttpProblemError(503, 'Authorization Unavailable', 'Unable to resolve authorization context.');
  }

  const body = toAuthzContextPayload(await response.json());

  if (!body) {
    throw new HttpProblemError(503, 'Authorization Unavailable', 'Authorization context payload is malformed.');
  }

  const userId =
    (typeof body.user?.id === 'string' && body.user.id) ||
    (typeof body.user?.subject === 'string' && body.user.subject) ||
    jwtPayload.sub;

  if (!userId) {
    throw new UnauthorizedError('Resolved authorization context must include userId.');
  }

  return {
    userId,
    displayName: typeof body.user?.name === 'string' ? body.user.name : jwtPayload.name ?? jwtPayload.preferred_username,
    permissions: body.permissions,
    authzVersion: body.version,
  };
}

export async function buildRuntimeContextFromRequest(
  request: FastifyRequest,
  config: AiOrchestratorConfig,
): Promise<McadRuntimeContext> {
  const accessToken = getBearerToken(request.headers.authorization);
  const jwtPayload = decodeJwtPayload(accessToken);
  const resolvedAuthorization =
    resolveAuthorizationFromHeaders(request, jwtPayload, config) ??
    await fetchResolvedAuthorization(accessToken, jwtPayload, config);

  return createRuntimeContext({
    userId: resolvedAuthorization.userId,
    displayName: resolvedAuthorization.displayName,
    permissions: resolvedAuthorization.permissions,
    authzVersion: resolvedAuthorization.authzVersion,
    accessToken,
    requestId: request.id,
    locale: 'pt-BR',
    environment: config.environment,
  });
}

export function assertPermission(runtimeContext: McadRuntimeContext, permission: string): void {
  const values = runtimeContextToObject(runtimeContext);
  const hasPermission = values.permissions.includes(permission);
  const hasWildcard = values.permissions.includes('*');

  if (!hasPermission && !hasWildcard) {
    throw new ForbiddenError(`Missing required permission: ${permission}`);
  }
}
