import type { PermissionStatus } from '../types/permission';

export interface AuthzPermissionLifecycleCapabilities {
  canCreate: boolean;
  canDeprecate: boolean;
  canListLinkedRoles: boolean;
  canReactivate: boolean;
  canRemove: boolean;
}

export type AuthzPermissionLifecycleOperation =
  | 'create'
  | 'deprecate'
  | 'listLinkedRoles'
  | 'reactivate'
  | 'remove';

export type UnsupportedAuthzPermissionLifecycleOperation = Extract<
  AuthzPermissionLifecycleOperation,
  'create' | 'reactivate' | 'remove'
>;

export type AuthzPermissionLifecyclePhase = 'PHASE_1' | 'PHASE_2';

export interface PermissionOperationUnavailableError {
  code: 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE';
  message: string;
  operation: UnsupportedAuthzPermissionLifecycleOperation;
  upstream: 'ecad-authz';
  missingEndpoint: string;
  phase: 'PHASE_2';
}

const operationCapabilities: Record<
  AuthzPermissionLifecycleOperation,
  keyof AuthzPermissionLifecycleCapabilities
> = {
  create: 'canCreate',
  deprecate: 'canDeprecate',
  listLinkedRoles: 'canListLinkedRoles',
  reactivate: 'canReactivate',
  remove: 'canRemove',
};

const missingUpstreamEndpoints: Record<UnsupportedAuthzPermissionLifecycleOperation, string> = {
  create: 'POST /v1/permissions',
  reactivate: 'POST /v1/permissions/{permissionId}/reactivate',
  remove: 'POST /v1/permissions/{permissionId}/remove',
};

export const AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES: Readonly<AuthzPermissionLifecycleCapabilities> = Object.freeze({
  canCreate: false,
  canDeprecate: true,
  canListLinkedRoles: true,
  canReactivate: false,
  canRemove: false,
});

export const AUTHZ_PERMISSION_LIFECYCLE_PHASES = Object.freeze({
  PHASE_1: Object.freeze(['deprecate', 'listLinkedRoles'] as const),
  PHASE_2: Object.freeze(['create', 'reactivate', 'remove'] as const),
}) satisfies Readonly<Record<AuthzPermissionLifecyclePhase, readonly AuthzPermissionLifecycleOperation[]>>;

export const AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS = 501;

export const PERMISSION_STATUS_LABELS: Readonly<Record<PermissionStatus, string>> = Object.freeze({
  ACTIVE: 'Ativa',
  DEPRECATED: 'Depreciada',
  DISABLED: 'Removida',
});

export const PERMISSION_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: PermissionStatus | '';
  label: string;
}> = Object.freeze([
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'DEPRECATED', label: 'Depreciadas' },
  { value: 'DISABLED', label: 'Removidas' },
]);

export function getPermissionStatusLabel(status: PermissionStatus): string {
  return PERMISSION_STATUS_LABELS[status];
}

export function isPermissionLifecycleOperationAvailable(
  operation: AuthzPermissionLifecycleOperation,
): boolean {
  return AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES[operationCapabilities[operation]];
}

export function getMissingUpstreamEndpoint(
  operation: UnsupportedAuthzPermissionLifecycleOperation,
): string {
  return missingUpstreamEndpoints[operation];
}

export function buildPermissionOperationUnavailableError(
  operation: UnsupportedAuthzPermissionLifecycleOperation,
): PermissionOperationUnavailableError {
  const missingEndpoint = getMissingUpstreamEndpoint(operation);

  return {
    code: 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE',
    message: `Operacao indisponivel no momento: o ecad-authz ainda nao expoe ${missingEndpoint}.`,
    operation,
    upstream: 'ecad-authz',
    missingEndpoint,
    phase: 'PHASE_2',
  };
}

/**
 * Type guard for the standardised error thrown when a Phase 2 BFF route
 * responds with 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE.
 * Allows pages and hooks to branch on this specific error shape without
 * coupling to HTTP status codes directly.
 */
export function isPermissionOperationUnavailableError(
  error: unknown,
): error is PermissionOperationUnavailableError {
  if (!error || typeof error !== 'object') return false;
  return (error as Record<string, unknown>).code === 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE';
}
