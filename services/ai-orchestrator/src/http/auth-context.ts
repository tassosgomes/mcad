import type { FastifyRequest } from 'fastify';
import type { AiOrchestratorConfig } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from './errors.js';
import {
  createRuntimeContext,
  runtimeContextToObject,
  type McadRuntimeContext,
} from '../schemas/runtime-context.js';

interface JwtPayload {
  sub?: string;
  name?: string;
  preferred_username?: string;
  roles?: string[];
  permissions?: string[];
  scope?: string;
}

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

export function buildRuntimeContextFromRequest(
  request: FastifyRequest,
  config: AiOrchestratorConfig,
): McadRuntimeContext {
  const accessToken = getBearerToken(request.headers.authorization);
  const jwtPayload = decodeJwtPayload(accessToken);
  const headerRoles = splitHeaderList(request.headers['x-mcad-roles']);
  const headerPermissions = splitHeaderList(request.headers['x-mcad-permissions']);
  const scopePermissions = jwtPayload.scope?.split(' ').filter(Boolean) ?? [];

  return createRuntimeContext({
    userId:
      (request.headers['x-mcad-user-id'] as string | undefined) ??
      jwtPayload.sub ??
      'authenticated-user',
    displayName:
      (request.headers['x-mcad-user-name'] as string | undefined) ??
      jwtPayload.name ??
      jwtPayload.preferred_username,
    roles: headerRoles.length > 0 ? headerRoles : jwtPayload.roles ?? [],
    permissions:
      headerPermissions.length > 0
        ? headerPermissions
        : jwtPayload.permissions ?? scopePermissions,
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
  const isAdmin = values.roles.includes('admin') || values.roles.includes('super-admin');

  if (!hasPermission && !hasWildcard && !isAdmin) {
    throw new ForbiddenError(`Missing required permission: ${permission}`);
  }
}
