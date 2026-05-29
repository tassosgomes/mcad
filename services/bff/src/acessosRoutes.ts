import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { BffConfig } from './config.js';
import { type FetchLike, resolveAuthzContext, sendError } from './authzContext.js';

/**
 * Public BFF contract:
 * - GET /api/acessos/assignments -> {items, page, size, total}; each item has
 *   subject, userId, email, name and roles [{assignmentId, key, roleId, domain, displayName}].
 * - GET /api/acessos/papeis -> proxies ecad-authz role catalog page.
 * - POST /api/acessos/papeis/atribuir body {userId, roleKey, scope?} -> 204.
 * - DELETE /api/acessos/papeis/atribuir/:assignmentId -> 204, where assignmentId
 *   is the reversible BFF id emitted by assignments: encode(userId):encode(roleId).
 *
 * TODO metrics: wire RED counters/histograms when this BFF exposes a metrics
 * registry. There is no metrics helper in the current Fastify service.
 */

const FULL_LIST_PERMISSION = 'acessos:default:papel:listar';
const ASSIGN_PERMISSION = 'acessos:default:papel:atribuir';
const REMOVE_PERMISSION = 'acessos:default:papel:remover';
const SCOPED_VIEW_PERMISSION = /^acessos:([a-z-]+):papel:visualizar$/;

export interface AcessosRoutesOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
}

interface ScopedAccess {
  allDomains: boolean;
  scoped: string[];
}

interface AuthzFetchResult {
  status: number;
  body: unknown;
  headers: { get(name: string): string | null };
}

interface UserSummary {
  id: string;
  subject: string;
  email?: string;
  name?: string;
}

interface RoleCatalogItem {
  id: string;
  key: string;
  domain: string;
  displayName: string;
}

interface AssignmentRole {
  assignmentId: string;
  key: string;
  roleId: string;
  domain: string;
  displayName: string;
}

interface AssignmentItem {
  subject: string;
  userId: string;
  email?: string;
  name?: string;
  roles: AssignmentRole[];
}

export function deriveScopedDomains(permissions: string[]): ScopedAccess {
  if (permissions.includes(FULL_LIST_PERMISSION)) {
    return { allDomains: true, scoped: [] };
  }

  const scoped = permissions
    .map((permission) => SCOPED_VIEW_PERMISSION.exec(permission)?.[1])
    .filter((domain): domain is string => Boolean(domain) && domain !== 'default');

  return { allDomains: false, scoped: [...new Set(scoped)] };
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function getPageContent(body: unknown): unknown[] {
  const record = asRecord(body);
  if (!record) return [];
  if (Array.isArray(record.content)) return record.content;
  if (Array.isArray(record.items)) return record.items;
  return [];
}

function getPageNumber(body: unknown, field: 'page' | 'size', fallback: number): number {
  const record = asRecord(body);
  return record ? getNumber(record[field], fallback) : fallback;
}

function getTotal(body: unknown): number {
  const record = asRecord(body);
  if (!record) return 0;
  return getNumber(record.totalElements, getNumber(record.total, getPageContent(body).length));
}

function toUserSummary(value: unknown): UserSummary | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const id = getString(record.id);
  if (!id) return undefined;

  return {
    id,
    subject: getString(record.subject) ?? id,
    email: getString(record.email),
    name: getString(record.name),
  };
}

function roleDomainFromKey(roleKey: string): string {
  return roleKey.split('.')[0] ?? 'unknown';
}

function toRoleCatalogItem(value: unknown): RoleCatalogItem | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const key = getString(record.key) ?? getString(record.roleKey);
  if (!key) return undefined;

  const id = getString(record.id) ?? key;
  const domain = getString(record.domain) ?? roleDomainFromKey(key);
  const displayName = getString(record.displayName) ?? key;

  return { id, key, domain, displayName };
}

function buildAssignmentId(userId: string, roleId: string): string {
  return `${encodeURIComponent(userId)}:${encodeURIComponent(roleId)}`;
}

function parseAssignmentId(assignmentId: string): { userId: string; roleId: string } | undefined {
  const separator = assignmentId.indexOf(':');
  if (separator <= 0 || separator === assignmentId.length - 1) {
    return undefined;
  }

  try {
    return {
      userId: decodeURIComponent(assignmentId.slice(0, separator)),
      roleId: decodeURIComponent(assignmentId.slice(separator + 1)),
    };
  } catch {
    return undefined;
  }
}

function toAssignmentRole(
  value: unknown,
  userId: string,
  rolesByKey: Map<string, RoleCatalogItem>,
): AssignmentRole | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const status = getString(record.status);
  if (status && status !== 'ACTIVE') return undefined;

  const roleKey = getString(record.roleKey) ?? getString(record.key);
  if (!roleKey) return undefined;

  const catalogRole = rolesByKey.get(roleKey);
  const roleId = catalogRole?.id ?? getString(record.roleId) ?? roleKey;
  const domain = catalogRole?.domain ?? roleDomainFromKey(roleKey);

  return {
    assignmentId: buildAssignmentId(userId, roleId),
    key: roleKey,
    roleId,
    domain,
    displayName: catalogRole?.displayName ?? roleKey,
  };
}

function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}

function queryValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function appendAccessQuery(url: URL, query: Record<string, unknown>): void {
  const page = queryValue(query.page);
  const size = queryValue(query.size);
  const search = queryValue(query.query);
  const sort = queryValue(query.sort);

  if (page) url.searchParams.set('page', page);
  if (size) url.searchParams.set('size', size);
  if (search) url.searchParams.set('q', search);
  if (sort) url.searchParams.set('sort', sort);
}

async function fetchAuthz(
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
    headers['x-correlation-id'] = init.correlationId;
  }

  let body: string | undefined;
  if (init.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(init.body);
  }

  try {
    const response = await fetchImpl(url, {
      method: init.method ?? 'GET',
      headers,
      body,
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
        body: { code: 'AUTHZ_UNAVAILABLE' },
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
      body: { code: 'AUTHZ_UNAVAILABLE' },
      headers: { get: () => null },
    };
  } finally {
    clearTimeout(timer);
  }
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

function mapUpstreamErrorBody(body: unknown, fallbackCode: string): { code: string; message?: string } {
  const record = asRecord(body);
  const code = getString(record?.code) ?? fallbackCode;
  const message = getString(record?.message);
  return { code, ...(message ? { message } : {}) };
}

export async function registerAcessosRoutes(
  server: FastifyInstance,
  options: AcessosRoutesOptions,
): Promise<void> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for acessos routes');
  }

  server.get('/api/acessos/assignments', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
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
      fetchImpl,
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
      fetchImpl,
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
        fetchImpl,
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

      if (filteredRoles.length > 0) {
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
  });

  server.get('/api/acessos/papeis', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    if (!hasPermission(ctx.payload.permissions, FULL_LIST_PERMISSION)) {
      return sendError(reply, 403, 'PERMISSION_DENIED');
    }

    const url = new URL(`${options.config.authzBaseUrl}/v1/roles`);
    for (const [key, value] of Object.entries((request.query as Record<string, unknown>) ?? {})) {
      const stringValue = queryValue(value);
      if (stringValue) url.searchParams.set(key, stringValue);
    }

    const result = await fetchAuthz(
      request,
      options.config,
      fetchImpl,
      ctx.token,
      `${url.pathname}${url.search}`,
      { correlationId: request.id },
    );

    setAuthzVersionHeader(request, reply.header.bind(reply), ctx.authzVersionHeader);
    return reply.code(result.status).send(result.body);
  });

  server.post('/api/acessos/papeis/atribuir', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    if (!hasPermission(ctx.payload.permissions, ASSIGN_PERMISSION)) {
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
      fetchImpl,
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
      const authzVersion = result.headers.get('x-authz-version') ?? ctx.authzVersionHeader;
      setAuthzVersionHeader(request, reply.header.bind(reply), authzVersion);
      return reply.code(204).send();
    }

    return reply.code(result.status).send(mapUpstreamErrorBody(result.body, 'AUTHZ_UNAVAILABLE'));
  });

  server.delete('/api/acessos/papeis/atribuir/:assignmentId', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    if (!hasPermission(ctx.payload.permissions, REMOVE_PERMISSION)) {
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
      fetchImpl,
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
      const authzVersion = result.headers.get('x-authz-version') ?? ctx.authzVersionHeader;
      setAuthzVersionHeader(request, reply.header.bind(reply), authzVersion);
      return reply.code(204).send();
    }

    return reply.code(result.status).send(mapUpstreamErrorBody(result.body, 'AUTHZ_UNAVAILABLE'));
  });
}
