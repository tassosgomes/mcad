import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { BffConfig } from './config.js';
import { type FetchLike, resolveAuthzContext, sendError } from './authzContext.js';
import { toUuidCorrelationId } from './correlationId.js';
import {
  buildPermissionOperationUnavailableBody,
  AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS,
} from './authzPermissionLifecycleContract.js';

/**
 * Public BFF contract (Fase 1):
 * - GET  /api/autorizacao/permissoes/:id/papeis-vinculados
 *     → { permissionId, permissionStatus, linkedRoles[], canRemove, blockingReason? }
 *     Aggregates ecad-authz GET /v1/roles + GET /v1/roles/{roleId}/permissions fan-out.
 * - POST /api/autorizacao/permissoes/:id/depreciar
 *     → audited wrapper for PATCH /v1/permissions/{id}/deprecate.
 *     Propagates x-authz-version; publishes PERMISSION_LIFECYCLE audit event.
 *
 * Phase 2 stubs (fail-closed; upstream endpoints not yet available):
 * - POST /api/autorizacao/permissoes                    → 501
 * - POST /api/autorizacao/permissoes/:id/reativar       → 501
 * - POST /api/autorizacao/permissoes/:id/remover        → 501
 */

const VIEW_PERMISSION = 'authz:admin:permission:visualizar';
const DEPRECATE_PERMISSION = 'authz:admin:permission:depreciar';

export interface PermissionLifecycleRoutesOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
}

export interface LinkedRoleDto {
  id: string;
  key: string;
  displayName: string;
  status: string;
}

export interface PermissionRemovalEligibility {
  permissionId: string;
  permissionStatus: string;
  linkedRoles: LinkedRoleDto[];
  canRemove: boolean;
  blockingReason?: 'STATUS_NOT_DEPRECATED' | 'ROLE_LINKS_PRESENT';
}

interface PermissionDto {
  id: string;
  key: string;
  displayName: string;
  description?: string | null;
  status: string;
  [key: string]: unknown;
}

interface AuthzFetchResult {
  status: number;
  body: unknown;
  headers: { get(name: string): string | null };
}

interface PermissionLifecycleAuditEvent {
  eventType: 'PERMISSION_LIFECYCLE';
  schemaVersion: 1;
  eventId: string;
  occurredAt: string;
  action: 'deprecate';
  outcome: 'SUCCESS' | 'FAILURE';
  actor: { subject: string };
  permission: { id: string; key: string };
  correlationId: string;
  errorCode?: string;
}

interface LifecycleAuditLogger {
  warn(payload: Record<string, unknown>, message: string): void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getItems(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const record = asRecord(body);
  if (!record) return [];
  if (Array.isArray(record.content)) return record.content;
  if (Array.isArray(record.items)) return record.items;
  return [];
}

function mapUpstreamErrorBody(body: unknown, fallbackCode: string): { code: string; message?: string } {
  const record = asRecord(body);
  const code = getString(record?.code) ?? fallbackCode;
  const message = getString(record?.message);
  return { code, ...(message ? { message } : {}) };
}

function toPermissionDto(value: unknown): PermissionDto | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const id = getString(record.id);
  const key = getString(record.key) ?? getString(record.permissionKey);
  if (!id || !key) return undefined;

  return {
    ...record,
    id,
    key,
    displayName: getString(record.displayName) ?? key,
    description: record.description != null ? getString(record.description) ?? null : null,
    status: getString(record.status) ?? 'ACTIVE',
  };
}

function toLinkedRoleDto(value: unknown): LinkedRoleDto | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const id = getString(record.id);
  const key = getString(record.key) ?? getString(record.roleKey);
  if (!id || !key) return undefined;

  return {
    id,
    key,
    displayName: getString(record.displayName) ?? key,
    status: getString(record.status) ?? 'ACTIVE',
  };
}

/**
 * Checks whether a permission (identified by id or key) appears in a role's
 * permission list. Defensive: accepts id, key, permissionKey or bare string.
 */
function permissionIsInList(
  permissionId: string,
  permissionKey: string,
  permissions: unknown[],
): boolean {
  return permissions.some((p) => {
    if (typeof p === 'string') {
      return p === permissionKey || p === permissionId;
    }
    const record = asRecord(p);
    if (!record) return false;
    if (getString(record.id) === permissionId) return true;
    const pKey = getString(record.key) ?? getString(record.permissionKey);
    if (pKey && pKey === permissionKey) return true;
    return false;
  });
}

function buildAuditEventsUrl(auditBaseUrl: string): string {
  const normalized = auditBaseUrl.replace(/\/$/, '');
  if (normalized.endsWith('/api/v1/audit')) return `${normalized}/events`;
  if (normalized.endsWith('/api/v1')) return `${normalized}/audit/events`;
  return `${normalized}/api/v1/audit/events`;
}

function setAuthzVersionHeader(
  upstreamHeader: string | null,
  requestHeader: string | string[] | undefined,
  setHeader: (name: string, value: string) => void,
): void {
  const value = upstreamHeader ?? (Array.isArray(requestHeader) ? requestHeader[0] : requestHeader);
  if (typeof value === 'string' && value.length > 0) {
    setHeader('x-authz-version', value);
  }
}

async function firePermissionLifecycleAuditEvent(
  event: PermissionLifecycleAuditEvent,
  options: {
    config: BffConfig;
    fetchImpl: FetchLike;
    log: LifecycleAuditLogger;
  },
): Promise<void> {
  const url = buildAuditEventsUrl(options.config.auditBaseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.config.auditTimeoutMs);

  try {
    await options.fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': event.correlationId,
      },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
  } catch (error) {
    options.log.warn(
      { err: error, eventId: event.eventId },
      'permission.lifecycle.audit.publish_failed',
    );
  } finally {
    clearTimeout(timer);
  }
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

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function registerPermissionLifecycleRoutes(
  server: FastifyInstance,
  options: PermissionLifecycleRoutesOptions,
): Promise<void> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for permission lifecycle routes');
  }

  // -------------------------------------------------------------------------
  // GET /api/autorizacao/permissoes/:id/papeis-vinculados
  // Returns PermissionRemovalEligibility built by fan-out aggregation.
  // -------------------------------------------------------------------------
  server.get('/api/autorizacao/permissoes/:id/papeis-vinculados', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    if (!ctx.payload.permissions.includes(VIEW_PERMISSION)) {
      return sendError(reply, 403, 'PERMISSION_DENIED');
    }

    const params = request.params as { id?: string };
    const permissionId = getString(params.id);
    if (!permissionId) {
      return sendError(reply, 400, 'INVALID_REQUEST', 'Permission ID is required');
    }

    // 2.2 — Fetch permission detail
    const permissionResult = await fetchAuthz(
      request,
      options.config,
      fetchImpl,
      ctx.token,
      `/v1/permissions/${encodeURIComponent(permissionId)}`,
      { correlationId: request.id },
    );

    if (permissionResult.status === 404) {
      return reply.code(404).send(mapUpstreamErrorBody(permissionResult.body, 'PERMISSION_NOT_FOUND'));
    }

    if (permissionResult.status !== 200) {
      return reply
        .code(permissionResult.status)
        .send(mapUpstreamErrorBody(permissionResult.body, 'AUTHZ_UNAVAILABLE'));
    }

    const permission = toPermissionDto(permissionResult.body);
    if (!permission) {
      request.log.error({ permissionId }, 'upstream returned unparseable permission detail');
      return sendError(reply, 503, 'AUTHZ_UNAVAILABLE', 'Invalid permission response from upstream');
    }

    // 2.3 — Fetch role catalog (bounded to 200 to match ecad-authz admin volume)
    const rolesResult = await fetchAuthz(
      request,
      options.config,
      fetchImpl,
      ctx.token,
      '/v1/roles?page=0&size=200&sort=displayName,asc',
      { correlationId: request.id },
    );

    if (rolesResult.status !== 200) {
      return reply
        .code(rolesResult.status)
        .send(mapUpstreamErrorBody(rolesResult.body, 'AUTHZ_UNAVAILABLE'));
    }

    const allRoles = getItems(rolesResult.body)
      .map(toLinkedRoleDto)
      .filter((r): r is LinkedRoleDto => r !== undefined);

    // 2.4 — Fan-out: GET /v1/roles/{roleId}/permissions for each role in parallel
    const fanoutResults = await Promise.all(
      allRoles.map(async (role) => {
        const result = await fetchAuthz(
          request,
          options.config,
          fetchImpl,
          ctx.token,
          `/v1/roles/${encodeURIComponent(role.id)}/permissions`,
          { correlationId: request.id },
        );
        return { role, result };
      }),
    );

    // Surface the first fan-out error (503 or 4xx from upstream)
    const fanoutError = fanoutResults.find(({ result }) => result.status !== 200);
    if (fanoutError) {
      request.log.warn(
        { roleId: fanoutError.role.id, status: fanoutError.result.status },
        'authz fan-out error fetching role permissions',
      );
      return reply
        .code(fanoutError.result.status)
        .send(mapUpstreamErrorBody(fanoutError.result.body, 'AUTHZ_UNAVAILABLE'));
    }

    // 2.4 — Filter roles that contain the target permission (by id or key)
    const linkedRoles = fanoutResults
      .filter(({ result }) =>
        permissionIsInList(permission.id, permission.key, getItems(result.body)),
      )
      .map(({ role }) => role);

    // 2.5, 2.6 — Build PermissionRemovalEligibility
    // Only ACTIVE linked roles block removal (subtarefa 2.6)
    const activeLinkedRoles = linkedRoles.filter((role) => role.status === 'ACTIVE');
    const isDeprecated = permission.status === 'DEPRECATED';

    let blockingReason: 'STATUS_NOT_DEPRECATED' | 'ROLE_LINKS_PRESENT' | undefined;
    if (!isDeprecated) {
      blockingReason = 'STATUS_NOT_DEPRECATED';
    } else if (activeLinkedRoles.length > 0) {
      blockingReason = 'ROLE_LINKS_PRESENT';
    }

    const canRemove = isDeprecated && activeLinkedRoles.length === 0;

    const eligibility: PermissionRemovalEligibility = {
      permissionId: permission.id,
      permissionStatus: permission.status,
      linkedRoles,
      canRemove,
      ...(blockingReason !== undefined ? { blockingReason } : {}),
    };

    request.log.info(
      {
        action: 'authz.permission.listLinkedRoles',
        actor: ctx.payload.user.subject,
        permissionId: permission.id,
        permissionKey: permission.key,
        linkedRolesCount: linkedRoles.length,
        activeLinkedRolesCount: activeLinkedRoles.length,
        canRemove,
        blockingReason,
      },
      'permission linked roles resolved',
    );

    return reply.code(200).send(eligibility);
  });

  // -------------------------------------------------------------------------
  // POST /api/autorizacao/permissoes/:id/depreciar
  // Audited BFF wrapper: calls PATCH /v1/permissions/{id}/deprecate upstream.
  // Uses POST locally for consistency with other governed action endpoints.
  // -------------------------------------------------------------------------
  server.post('/api/autorizacao/permissoes/:id/depreciar', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    if (!ctx.payload.permissions.includes(DEPRECATE_PERMISSION)) {
      return sendError(reply, 403, 'PERMISSION_DENIED');
    }

    const params = request.params as { id?: string };
    const permissionId = getString(params.id);
    if (!permissionId) {
      return sendError(reply, 400, 'INVALID_REQUEST', 'Permission ID is required');
    }

    const correlationId = toUuidCorrelationId(request.id);

    const result = await fetchAuthz(
      request,
      options.config,
      fetchImpl,
      ctx.token,
      `/v1/permissions/${encodeURIComponent(permissionId)}/deprecate`,
      { method: 'PATCH', correlationId },
    );

    const ok = result.status >= 200 && result.status < 300;
    const errorBody = !ok ? mapUpstreamErrorBody(result.body, 'AUTHZ_UNAVAILABLE') : undefined;
    const errorCode = errorBody?.code;

    request.log.info(
      {
        action: 'authz.permission.deprecate',
        actor: ctx.payload.user.subject,
        permissionId,
        outcome: ok ? 'ok' : 'failed',
        status: result.status,
        correlationId,
        ...(errorCode ? { errorCode } : {}),
      },
      ok ? 'permission deprecated' : 'permission deprecation failed',
    );

    // Fire-and-forget: publish audit event for success and for relevant upstream failures.
    // 401/403 at BFF level do not reach this point.
    const deprecatedPermission = ok ? toPermissionDto(result.body) : undefined;
    const auditEvent: PermissionLifecycleAuditEvent = {
      eventType: 'PERMISSION_LIFECYCLE',
      schemaVersion: 1,
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      action: 'deprecate',
      outcome: ok ? 'SUCCESS' : 'FAILURE',
      actor: { subject: ctx.payload.user.subject },
      permission: {
        id: permissionId,
        key: deprecatedPermission?.key ?? '',
      },
      correlationId,
      ...(errorCode ? { errorCode } : {}),
    };

    firePermissionLifecycleAuditEvent(auditEvent, {
      config: options.config,
      fetchImpl,
      log: request.log,
    }).catch((err: unknown) => {
      request.log.warn({ err }, 'permission.lifecycle.audit.publish_failed (outer)');
    });

    if (ok) {
      const upstreamAuthzVersion = result.headers.get('x-authz-version');
      setAuthzVersionHeader(
        upstreamAuthzVersion,
        request.headers['x-authz-version'],
        reply.header.bind(reply),
      );
      return reply.code(200).send(deprecatedPermission ?? result.body);
    }

    return reply.code(result.status).send(errorBody);
  });

  // -------------------------------------------------------------------------
  // POST /api/autorizacao/permissoes — Phase 2 stub (fail-closed)
  // Upstream POST /v1/permissions not yet available.
  // -------------------------------------------------------------------------
  server.post('/api/autorizacao/permissoes', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    return reply
      .code(AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS)
      .send(buildPermissionOperationUnavailableBody('create'));
  });

  // -------------------------------------------------------------------------
  // POST /api/autorizacao/permissoes/:id/reativar — Phase 2 stub (fail-closed)
  // Upstream POST /v1/permissions/{id}/reactivate not yet available.
  // -------------------------------------------------------------------------
  server.post('/api/autorizacao/permissoes/:id/reativar', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    return reply
      .code(AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS)
      .send(buildPermissionOperationUnavailableBody('reactivate'));
  });

  // -------------------------------------------------------------------------
  // POST /api/autorizacao/permissoes/:id/remover — Phase 2 stub (fail-closed)
  // Upstream POST /v1/permissions/{id}/remove not yet available.
  // -------------------------------------------------------------------------
  server.post('/api/autorizacao/permissoes/:id/remover', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    return reply
      .code(AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS)
      .send(buildPermissionOperationUnavailableBody('remove'));
  });
}
