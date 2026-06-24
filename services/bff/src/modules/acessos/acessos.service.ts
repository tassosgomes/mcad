import type { FastifyReply, FastifyRequest } from 'fastify';
import type { BffConfig } from '../../config/config.js';
import { type FetchLike, resolveAuthzContext, sendError } from '../../shared/auth/authzContext.js';
import type { MeCache } from '../../shared/auth/meCache.js';
import { fetchAuthz } from './acessos.client.js';
import {
  ACESSOS_PERMISSIONS,
  deriveScopedDomains,
  hasPermission,
} from './acessos.permissions.js';
import {
  appendAccessQuery,
  asRecord,
  getPageContent,
  getPageNumber,
  getString,
  getTotal,
  isDefined,
  mapUpstreamErrorBody,
  normalizeRolesPage,
  normalizeUserSearch,
  queryValue,
  type AssignmentItem,
  type RoleCatalogItem,
  toAssignmentRole,
  toRoleCatalogItem,
  toUserSummary,
} from './acessos.mapper.js';
import { parseAssignmentId } from './assignmentId.js';

export interface AcessosServiceOptions {
  config: BffConfig;
  fetchImpl: FetchLike;
  cache?: MeCache;
}

function setAuthzVersionHeader(
  request: FastifyRequest,
  replyHeader: (name: string, value: string) => void,
  upstreamHeader: string | null,
): void {
  const value = upstreamHeader ?? request.headers['x-authz-version'];
  if (typeof value === 'string' && value.length > 0) {
    replyHeader('x-authz-version', value);
  }
}

function parseAuthzVersion(value: string | null): number | undefined {
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function invalidateMeCache(cache: MeCache | undefined, userId: string, authzVersionHeader: string | null): void {
  if (!cache) return;

  const authzVersion = parseAuthzVersion(authzVersionHeader);
  if (authzVersion !== undefined) {
    cache.maybeUpdateVersion(userId, authzVersion);
  }

  cache.invalidate(userId);
}

export async function handleListUsuarios(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AcessosServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!hasPermission(ctx.payload.permissions, ACESSOS_PERMISSIONS.listUsers)) {
    return sendError(reply, 403, 'PERMISSION_DENIED');
  }

  const query = (request.query as Record<string, unknown>) ?? {};
  const url = new URL(`${options.config.authzBaseUrl}/v1/users`);
  appendAccessQuery(url, query);

  const result = await fetchAuthz(
    request,
    options.config,
    options.fetchImpl,
    ctx.token,
    `${url.pathname}${url.search}`,
    { correlationId: request.id },
  );

  if (result.status !== 200) {
    return reply.code(result.status).send(mapUpstreamErrorBody(result.body, 'AUTHZ_UNAVAILABLE'));
  }

  setAuthzVersionHeader(request, reply.header.bind(reply), ctx.authzVersionHeader);
  return reply.code(200).send(
    normalizeUserSearch(
      result.body,
      Number(queryValue(query.page) ?? 0),
      Number(queryValue(query.size) ?? getPageContent(result.body).length),
    ),
  );
}

export async function handleListAssignments(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AcessosServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  const access = deriveScopedDomains(ctx.payload.permissions);
  if (!access.allDomains && access.scoped.length === 0) {
    return sendError(reply, 403, 'PERMISSION_DENIED');
  }

  const query = (request.query as Record<string, unknown>) ?? {};
  const usersUrl = new URL(`${options.config.authzBaseUrl}/v1/users`);
  appendAccessQuery(usersUrl, query);

  const usersResult = await fetchAuthz(
    request,
    options.config,
    options.fetchImpl,
    ctx.token,
    `${usersUrl.pathname}${usersUrl.search}`,
    { correlationId: request.id },
  );

  if (usersResult.status !== 200) {
    return reply.code(usersResult.status).send(mapUpstreamErrorBody(usersResult.body, 'AUTHZ_UNAVAILABLE'));
  }

  const rolesResult = await fetchAuthz(
    request,
    options.config,
    options.fetchImpl,
    ctx.token,
    '/v1/roles?page=0&size=200&sort=displayName,asc',
    { correlationId: request.id },
  );

  if (rolesResult.status !== 200) {
    return reply.code(rolesResult.status).send(mapUpstreamErrorBody(rolesResult.body, 'AUTHZ_UNAVAILABLE'));
  }

  const rolesByKey = new Map<string, RoleCatalogItem>();
  for (const role of getPageContent(rolesResult.body).map(toRoleCatalogItem).filter(isDefined)) {
    rolesByKey.set(role.key, role);
  }

  const users = getPageContent(usersResult.body).map(toUserSummary).filter(isDefined);
  const items: AssignmentItem[] = [];

  for (const user of users) {
    const assignmentsResult = await fetchAuthz(
      request,
      options.config,
      options.fetchImpl,
      ctx.token,
      `/v1/users/${encodeURIComponent(user.id)}/roles`,
      { correlationId: request.id },
    );

    if (assignmentsResult.status !== 200) {
      return reply
        .code(assignmentsResult.status)
        .send(mapUpstreamErrorBody(assignmentsResult.body, 'AUTHZ_UNAVAILABLE'));
    }

    const roles = (Array.isArray(assignmentsResult.body) ? assignmentsResult.body : [])
      .map((assignment) => toAssignmentRole(assignment, user.id, rolesByKey))
      .filter(isDefined);
    const filteredRoles = access.allDomains
      ? roles
      : roles.filter((role) => access.scoped.includes(role.domain));

    if (access.allDomains || filteredRoles.length > 0) {
      items.push({ ...user, userId: user.id, roles: filteredRoles });
    }
  }

  setAuthzVersionHeader(request, reply.header.bind(reply), ctx.authzVersionHeader);
  return reply.code(200).send({
    items,
    page: getPageNumber(usersResult.body, 'page', Number(queryValue(query.page) ?? 0)),
    size: getPageNumber(usersResult.body, 'size', Number(queryValue(query.size) ?? items.length)),
    total: access.allDomains ? getTotal(usersResult.body) : items.length,
  });
}

export async function handleListPapeis(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AcessosServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!hasPermission(ctx.payload.permissions, ACESSOS_PERMISSIONS.fullList)) {
    return sendError(reply, 403, 'PERMISSION_DENIED');
  }

  const query = (request.query as Record<string, unknown>) ?? {};
  const url = new URL(`${options.config.authzBaseUrl}/v1/roles`);
  for (const [key, value] of Object.entries(query)) {
    const stringValue = queryValue(value);
    if (stringValue) url.searchParams.set(key, stringValue);
  }

  const result = await fetchAuthz(
    request,
    options.config,
    options.fetchImpl,
    ctx.token,
    `${url.pathname}${url.search}`,
    { correlationId: request.id },
  );

  setAuthzVersionHeader(request, reply.header.bind(reply), ctx.authzVersionHeader);
  const body = result.status === 200 ? normalizeRolesPage(result.body, query) : result.body;
  return reply.code(result.status).send(body);
}

export async function handleAtribuirPapel(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AcessosServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!hasPermission(ctx.payload.permissions, ACESSOS_PERMISSIONS.assign)) {
    return sendError(reply, 403, 'PERMISSION_DENIED');
  }

  const body = asRecord(request.body);
  const userId = getString(body?.userId);
  const roleKey = getString(body?.roleKey);

  if (!userId || !roleKey) {
    return sendError(reply, 400, 'INVALID_REQUEST', 'userId and roleKey are required');
  }

  const result = await fetchAuthz(
    request,
    options.config,
    options.fetchImpl,
    ctx.token,
    `/v1/users/${encodeURIComponent(userId)}/roles`,
    {
      method: 'POST',
      body: { roleKey, ...(body?.scope ? { scope: body.scope } : {}) },
      correlationId: request.id,
    },
  );

  const ok = result.status >= 200 && result.status < 300;
  request.log.info(
    {
      action: 'acessos.papel.atribuir',
      actor: ctx.payload.user.subject,
      target: userId,
      role: roleKey,
      outcome: ok ? 'ok' : 'failed',
      status: result.status,
    },
    ok ? 'role assigned' : 'role assignment failed',
  );

  if (ok) {
    const upstreamAuthzVersion = result.headers.get('x-authz-version');
    invalidateMeCache(options.cache, userId, upstreamAuthzVersion);
    const authzVersion = upstreamAuthzVersion ?? ctx.authzVersionHeader;
    setAuthzVersionHeader(request, reply.header.bind(reply), authzVersion);
    return reply.code(204).send();
  }

  return reply.code(result.status).send(mapUpstreamErrorBody(result.body, 'AUTHZ_UNAVAILABLE'));
}

export async function handleRemoverPapel(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AcessosServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!hasPermission(ctx.payload.permissions, ACESSOS_PERMISSIONS.remove)) {
    return sendError(reply, 403, 'PERMISSION_DENIED');
  }

  const params = request.params as { assignmentId?: string };
  const parsed = params.assignmentId ? parseAssignmentId(params.assignmentId) : undefined;

  if (!parsed) {
    return sendError(reply, 400, 'INVALID_ASSIGNMENT_ID');
  }

  const result = await fetchAuthz(
    request,
    options.config,
    options.fetchImpl,
    ctx.token,
    `/v1/users/${encodeURIComponent(parsed.userId)}/roles/${encodeURIComponent(parsed.roleId)}`,
    { method: 'DELETE', correlationId: request.id },
  );

  const ok = result.status >= 200 && result.status < 300;
  request.log.info(
    {
      action: 'acessos.papel.remover',
      actor: ctx.payload.user.subject,
      target: parsed.userId,
      role: parsed.roleId,
      outcome: ok ? 'ok' : 'failed',
      status: result.status,
    },
    ok ? 'role removed' : 'role removal failed',
  );

  if (ok) {
    const upstreamAuthzVersion = result.headers.get('x-authz-version');
    invalidateMeCache(options.cache, parsed.userId, upstreamAuthzVersion);
    const authzVersion = upstreamAuthzVersion ?? ctx.authzVersionHeader;
    setAuthzVersionHeader(request, reply.header.bind(reply), authzVersion);
    return reply.code(204).send();
  }

  return reply.code(result.status).send(mapUpstreamErrorBody(result.body, 'AUTHZ_UNAVAILABLE'));
}
