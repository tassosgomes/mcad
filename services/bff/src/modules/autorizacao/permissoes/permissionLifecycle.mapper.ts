import type { FastifyRequest } from 'fastify';

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

export interface PermissionDto {
  id: string;
  key: string;
  displayName: string;
  description?: string | null;
  status: string;
  [key: string]: unknown;
}

export interface CreatePermissionInput {
  key: string;
  displayName: string;
  description?: string | null;
  domain: string;
  area: string;
  resource: string;
  action: string;
}

export interface AuthzFetchResult {
  status: number;
  body: unknown;
  headers: { get(name: string): string | null };
}

export function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function getItems(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const record = asRecord(body);
  if (!record) return [];
  if (Array.isArray(record.content)) return record.content;
  if (Array.isArray(record.items)) return record.items;
  return [];
}

export function mapUpstreamErrorBody(
  body: unknown,
  fallbackCode: string,
): { code: string; message?: string; correlationId?: string; details?: unknown } {
  const record = asRecord(body);
  const code = getString(record?.code) ?? fallbackCode;
  const message = getString(record?.message);
  const correlationId = getString(record?.correlationId);
  return {
    code,
    ...(message ? { message } : {}),
    ...(correlationId ? { correlationId } : {}),
    ...(record && 'details' in record ? { details: record.details } : {}),
  };
}

export function toPermissionDto(value: unknown): PermissionDto | undefined {
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

export function toLinkedRoleDto(value: unknown): LinkedRoleDto | undefined {
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

export function setResponseHeaders(
  result: AuthzFetchResult,
  request: FastifyRequest,
  reply: { header(name: string, value: string): unknown },
  fallbackCorrelationId: string,
): void {
  setAuthzVersionHeader(
    result.headers.get('x-authz-version'),
    request.headers['x-authz-version'],
    reply.header.bind(reply),
  );

  const upstreamCorrelationId = result.headers.get('x-correlation-id');
  reply.header('x-correlation-id', upstreamCorrelationId ?? fallbackCorrelationId);

  const location = result.headers.get('location');
  if (location) {
    reply.header('location', location);
  }
}

export function makeLocalError(
  code: string,
  message: string,
  correlationId: string,
  details?: unknown,
): { code: string; message: string; correlationId: string; details?: unknown } {
  return {
    code,
    message,
    correlationId,
    ...(details !== undefined ? { details } : {}),
  };
}

export function buildRemovalEligibility(
  permission: PermissionDto,
  linkedRoles: LinkedRoleDto[],
): PermissionRemovalEligibility {
  const activeLinkedRoles = linkedRoles.filter((role) => role.status === 'ACTIVE');
  const isDeprecated = permission.status === 'DEPRECATED';

  let blockingReason: 'STATUS_NOT_DEPRECATED' | 'ROLE_LINKS_PRESENT' | undefined;
  if (!isDeprecated) {
    blockingReason = 'STATUS_NOT_DEPRECATED';
  } else if (activeLinkedRoles.length > 0) {
    blockingReason = 'ROLE_LINKS_PRESENT';
  }

  return {
    permissionId: permission.id,
    permissionStatus: permission.status,
    linkedRoles,
    canRemove: isDeprecated && activeLinkedRoles.length === 0,
    ...(blockingReason !== undefined ? { blockingReason } : {}),
  };
}
