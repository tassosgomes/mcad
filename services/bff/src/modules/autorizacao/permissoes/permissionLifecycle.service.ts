import type { FastifyReply, FastifyRequest } from 'fastify';
import type { BffConfig } from '../../../config/config.js';
import { type FetchLike, resolveAuthzContext, sendError } from '../../../shared/auth/authzContext.js';
import { toUuidCorrelationId } from '../../../shared/http/correlationId.js';
import {
  buildPermissionLifecycleAuditEvent,
  firePermissionLifecycleAuditEvent,
  type PermissionLifecycleAuditEvent,
} from './permissionLifecycle.audit.js';
import { fetchAuthz } from './permissionLifecycle.client.js';
import {
  asRecord,
  buildRemovalEligibility,
  getItems,
  getString,
  makeLocalError,
  mapUpstreamErrorBody,
  setResponseHeaders,
  toLinkedRoleDto,
  toPermissionDto,
  type LinkedRoleDto,
  type PermissionDto,
} from './permissionLifecycle.mapper.js';
import {
  CONFIRMATION_TEXT,
  CREATE_PERMISSION,
  DEPRECATE_PERMISSION,
  REACTIVATE_PERMISSION,
  REMOVE_PERMISSION,
  VIEW_PERMISSION,
  parseCreatePermissionInput,
  validatePermissionInput,
} from './permissionLifecycle.validation.js';

export interface PermissionLifecycleServiceOptions {
  config: BffConfig;
  fetchImpl: FetchLike;
}

function publishAuditEvent(
  event: PermissionLifecycleAuditEvent,
  request: FastifyRequest,
  options: PermissionLifecycleServiceOptions,
): void {
  firePermissionLifecycleAuditEvent(event, {
    config: options.config,
    fetchImpl: options.fetchImpl,
    log: request.log,
  }).catch((err: unknown) => {
    request.log.warn({ err }, 'permission.lifecycle.audit.publish_failed (outer)');
  });
}

async function fetchPermission(
  request: FastifyRequest,
  options: PermissionLifecycleServiceOptions,
  token: string,
  permissionId: string,
  correlationId: string,
): Promise<{ resultStatus: number; body?: unknown; permission?: PermissionDto }> {
  const result = await fetchAuthz(
    request,
    options.config,
    options.fetchImpl,
    token,
    `/v1/permissions/${encodeURIComponent(permissionId)}`,
    { correlationId },
  );

  if (result.status !== 200) {
    return { resultStatus: result.status, body: result.body };
  }

  const permission = toPermissionDto(result.body);
  return { resultStatus: result.status, body: result.body, permission };
}

async function fetchLinkedRoles(
  request: FastifyRequest,
  options: PermissionLifecycleServiceOptions,
  token: string,
  permissionId: string,
  correlationId: string,
): Promise<{ status: number; body: unknown; headers: { get(name: string): string | null }; linkedRoles?: LinkedRoleDto[] }> {
  const result = await fetchAuthz(
    request,
    options.config,
    options.fetchImpl,
    token,
    `/v1/permissions/${encodeURIComponent(permissionId)}/roles?page=0&size=200&sort=displayName,asc`,
    { correlationId },
  );

  if (result.status !== 200) {
    return { status: result.status, body: result.body, headers: result.headers };
  }

  return {
    status: result.status,
    body: result.body,
    headers: result.headers,
    linkedRoles: getItems(result.body)
      .map(toLinkedRoleDto)
      .filter((role): role is LinkedRoleDto => role !== undefined),
  };
}

export async function handleListLinkedRoles(
  request: FastifyRequest,
  reply: FastifyReply,
  options: PermissionLifecycleServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!ctx.payload.permissions.includes(VIEW_PERMISSION)) {
    return sendError(reply, 403, 'PERMISSION_DENIED');
  }

  const params = request.params as { id?: string };
  const permissionId = getString(params.id);
  if (!permissionId) {
    return sendError(reply, 400, 'INVALID_REQUEST', 'Permission ID is required');
  }

  const correlationId = toUuidCorrelationId(request.id);
  const permissionResult = await fetchPermission(
    request,
    options,
    ctx.token,
    permissionId,
    correlationId,
  );

  if (permissionResult.resultStatus === 404) {
    return reply.code(404).send(mapUpstreamErrorBody(permissionResult.body, 'PERMISSION_NOT_FOUND'));
  }

  if (permissionResult.resultStatus !== 200) {
    return reply
      .code(permissionResult.resultStatus)
      .send(mapUpstreamErrorBody(permissionResult.body, 'AUTHZ_UNAVAILABLE'));
  }

  if (!permissionResult.permission) {
    request.log.error({ permissionId }, 'upstream returned unparseable permission detail');
    return sendError(reply, 503, 'AUTHZ_UNAVAILABLE', 'Invalid permission response from upstream');
  }

  const rolesResult = await fetchLinkedRoles(
    request,
    options,
    ctx.token,
    permissionResult.permission.id,
    correlationId,
  );

  if (rolesResult.status !== 200) {
    return reply
      .code(rolesResult.status)
      .send(mapUpstreamErrorBody(rolesResult.body, 'AUTHZ_UNAVAILABLE'));
  }

  const linkedRoles = rolesResult.linkedRoles ?? [];
  const activeLinkedRoles = linkedRoles.filter((role) => role.status === 'ACTIVE');
  const eligibility = buildRemovalEligibility(permissionResult.permission, linkedRoles);

  request.log.info(
    {
      action: 'authz.permission.listLinkedRoles',
      actor: ctx.payload.user.subject,
      permissionId: permissionResult.permission.id,
      permissionKey: permissionResult.permission.key,
      linkedRolesCount: linkedRoles.length,
      activeLinkedRolesCount: activeLinkedRoles.length,
      canRemove: eligibility.canRemove,
      blockingReason: eligibility.blockingReason,
    },
    'permission linked roles resolved',
  );

  setResponseHeaders(rolesResult, request, reply, correlationId);
  return reply.code(200).send(eligibility);
}

export async function handleDeprecatePermission(
  request: FastifyRequest,
  reply: FastifyReply,
  options: PermissionLifecycleServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
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
    options.fetchImpl,
    ctx.token,
    `/v1/permissions/${encodeURIComponent(permissionId)}/deprecate`,
    { method: 'PATCH', correlationId },
  );

  const ok = result.status >= 200 && result.status < 300;
  const errorBody = !ok ? mapUpstreamErrorBody(result.body, 'AUTHZ_UNAVAILABLE') : undefined;
  const errorCode = errorBody?.code;
  const deprecatedPermission = ok ? toPermissionDto(result.body) : undefined;

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

  publishAuditEvent(
    buildPermissionLifecycleAuditEvent({
      action: 'deprecate',
      outcome: ok ? 'SUCCESS' : 'FAILURE',
      actor: { subject: ctx.payload.user.subject },
      permission: {
        id: permissionId,
        key: deprecatedPermission?.key ?? '',
      },
      correlationId,
      ...(errorCode ? { errorCode } : {}),
    }),
    request,
    options,
  );

  if (ok) {
    setResponseHeaders(result, request, reply, correlationId);
    return reply.code(200).send(deprecatedPermission ?? result.body);
  }

  return reply.code(result.status).send(errorBody);
}

export async function handleCreatePermission(
  request: FastifyRequest,
  reply: FastifyReply,
  options: PermissionLifecycleServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!ctx.payload.permissions.includes(CREATE_PERMISSION)) {
    return sendError(reply, 403, 'PERMISSION_DENIED');
  }

  const correlationId = toUuidCorrelationId(request.id);
  const input = parseCreatePermissionInput(request.body);
  if (!input) {
    return reply
      .code(422)
      .send(makeLocalError('MISSING_PERMISSION', 'Required permission fields are missing', correlationId));
  }

  const validationErrors = validatePermissionInput(input);
  if (validationErrors.length > 0) {
    return reply
      .code(422)
      .send(makeLocalError('INVALID_PERMISSION_NAMESPACE', 'Invalid permission namespace', correlationId, validationErrors));
  }

  const result = await fetchAuthz(
    request,
    options.config,
    options.fetchImpl,
    ctx.token,
    '/v1/permissions',
    { method: 'POST', body: input, correlationId },
  );

  const ok = result.status === 201 || result.status === 200;
  const createdPermission = ok ? toPermissionDto(result.body) : undefined;
  const errorBody = !ok ? mapUpstreamErrorBody(result.body, 'AUTHZ_SERVICE_UNAVAILABLE') : undefined;
  const errorCode = errorBody?.code;

  request.log.info(
    {
      action: 'authz.permission.create',
      actor: ctx.payload.user.subject,
      permissionKey: input.key,
      outcome: ok ? 'ok' : 'failed',
      status: result.status,
      correlationId,
      ...(errorCode ? { errorCode } : {}),
    },
    ok ? 'permission created' : 'permission creation failed',
  );

  publishAuditEvent(
    buildPermissionLifecycleAuditEvent({
      action: 'create',
      outcome: ok ? 'SUCCESS' : 'FAILURE',
      actor: { subject: ctx.payload.user.subject },
      permission: { id: createdPermission?.id ?? '', key: input.key },
      correlationId,
      ...(errorCode ? { errorCode } : {}),
    }),
    request,
    options,
  );

  if (ok) {
    setResponseHeaders(result, request, reply, correlationId);
    return reply.code(201).send(createdPermission ?? result.body);
  }

  return reply.code(result.status).send(errorBody);
}

export async function handleReactivatePermission(
  request: FastifyRequest,
  reply: FastifyReply,
  options: PermissionLifecycleServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!ctx.payload.permissions.includes(REACTIVATE_PERMISSION)) {
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
    options.fetchImpl,
    ctx.token,
    `/v1/permissions/${encodeURIComponent(permissionId)}/reactivate`,
    { method: 'POST', correlationId },
  );

  const ok = result.status >= 200 && result.status < 300;
  const reactivatedPermission = ok ? toPermissionDto(result.body) : undefined;
  const errorBody = !ok ? mapUpstreamErrorBody(result.body, 'AUTHZ_SERVICE_UNAVAILABLE') : undefined;
  const errorCode = errorBody?.code;

  request.log.info(
    {
      action: 'authz.permission.reactivate',
      actor: ctx.payload.user.subject,
      permissionId,
      outcome: ok ? 'ok' : 'failed',
      status: result.status,
      correlationId,
      ...(errorCode ? { errorCode } : {}),
    },
    ok ? 'permission reactivated' : 'permission reactivation failed',
  );

  publishAuditEvent(
    buildPermissionLifecycleAuditEvent({
      action: 'reactivate',
      outcome: ok ? 'SUCCESS' : 'FAILURE',
      actor: { subject: ctx.payload.user.subject },
      permission: { id: permissionId, key: reactivatedPermission?.key ?? '' },
      correlationId,
      ...(errorCode ? { errorCode } : {}),
    }),
    request,
    options,
  );

  if (ok) {
    setResponseHeaders(result, request, reply, correlationId);
    return reply.code(200).send(reactivatedPermission ?? result.body);
  }

  return reply.code(result.status).send(errorBody);
}

export async function handleRemovePermission(
  request: FastifyRequest,
  reply: FastifyReply,
  options: PermissionLifecycleServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!ctx.payload.permissions.includes(REMOVE_PERMISSION)) {
    return sendError(reply, 403, 'PERMISSION_DENIED');
  }

  const params = request.params as { id?: string };
  const permissionId = getString(params.id);
  if (!permissionId) {
    return sendError(reply, 400, 'INVALID_REQUEST', 'Permission ID is required');
  }

  const correlationId = toUuidCorrelationId(request.id);
  const body = asRecord(request.body);
  const confirmationText = getString(body?.confirmationText);

  if (confirmationText !== CONFIRMATION_TEXT) {
    const errorBody = makeLocalError(
      'INVALID_CONFIRMATION',
      'Digite exatamente CONFIRMO para remover a permissao.',
      correlationId,
    );

    publishAuditEvent(
      buildPermissionLifecycleAuditEvent({
        action: 'remove',
        outcome: 'FAILURE',
        actor: { subject: ctx.payload.user.subject },
        permission: { id: permissionId, key: '' },
        correlationId,
        errorCode: errorBody.code,
      }),
      request,
      options,
    );

    return reply.code(400).send(errorBody);
  }

  const permissionResult = await fetchPermission(
    request,
    options,
    ctx.token,
    permissionId,
    correlationId,
  );

  if (permissionResult.resultStatus !== 200) {
    return reply
      .code(permissionResult.resultStatus)
      .send(mapUpstreamErrorBody(permissionResult.body, 'AUTHZ_SERVICE_UNAVAILABLE'));
  }

  if (!permissionResult.permission) {
    request.log.error({ permissionId }, 'upstream returned unparseable permission detail before removal');
    return sendError(reply, 503, 'AUTHZ_SERVICE_UNAVAILABLE', 'Invalid permission response from upstream');
  }

  if (permissionResult.permission.status !== 'DEPRECATED') {
    const errorBody = makeLocalError(
      'INVALID_PERMISSION_STATUS_TRANSITION',
      'Permissao precisa estar depreciada antes da remocao.',
      correlationId,
      { currentStatus: permissionResult.permission.status, requiredStatus: 'DEPRECATED' },
    );
    return reply.code(422).send(errorBody);
  }

  const rolesResult = await fetchLinkedRoles(
    request,
    options,
    ctx.token,
    permissionResult.permission.id,
    correlationId,
  );

  if (rolesResult.status !== 200) {
    return reply
      .code(rolesResult.status)
      .send(mapUpstreamErrorBody(rolesResult.body, 'AUTHZ_SERVICE_UNAVAILABLE'));
  }

  const activeLinkedRoles = (rolesResult.linkedRoles ?? []).filter((role) => role.status === 'ACTIVE');
  if (activeLinkedRoles.length > 0) {
    const errorBody = makeLocalError(
      'PERMISSION_IN_USE',
      'Permissao possui papeis ativos vinculados.',
      correlationId,
      { linkedRoles: activeLinkedRoles },
    );
    return reply.code(409).send(errorBody);
  }

  const result = await fetchAuthz(
    request,
    options.config,
    options.fetchImpl,
    ctx.token,
    `/v1/permissions/${encodeURIComponent(permissionId)}/remove`,
    { method: 'POST', body: { confirmationText }, correlationId },
  );

  const ok = result.status >= 200 && result.status < 300;
  const removedPermission = ok ? toPermissionDto(result.body) : undefined;
  const errorBody = !ok ? mapUpstreamErrorBody(result.body, 'AUTHZ_SERVICE_UNAVAILABLE') : undefined;
  const errorCode = errorBody?.code;

  request.log.info(
    {
      action: 'authz.permission.remove',
      actor: ctx.payload.user.subject,
      permissionId,
      permissionKey: permissionResult.permission.key,
      outcome: ok ? 'ok' : 'failed',
      status: result.status,
      correlationId,
      ...(errorCode ? { errorCode } : {}),
    },
    ok ? 'permission removed' : 'permission removal failed',
  );

  publishAuditEvent(
    buildPermissionLifecycleAuditEvent({
      action: 'remove',
      outcome: ok ? 'SUCCESS' : 'FAILURE',
      actor: { subject: ctx.payload.user.subject },
      permission: { id: permissionId, key: removedPermission?.key ?? permissionResult.permission.key },
      correlationId,
      ...(errorCode ? { errorCode } : {}),
    }),
    request,
    options,
  );

  if (ok) {
    setResponseHeaders(result, request, reply, correlationId);
    return reply.code(200).send(removedPermission ?? result.body);
  }

  return reply.code(result.status).send(errorBody);
}
