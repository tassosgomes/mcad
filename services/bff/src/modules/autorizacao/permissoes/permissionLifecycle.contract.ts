export interface AuthzPermissionLifecycleCapabilities {
  canCreate: boolean;
  canDeprecate: boolean;
  canListLinkedRoles: boolean;
  canReactivate: boolean;
  canRemove: boolean;
}

export type AuthzPermissionStatus = 'ACTIVE' | 'DEPRECATED' | 'DISABLED';

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

export interface PermissionOperationUnavailableBody {
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
  canCreate: true,
  canDeprecate: true,
  canListLinkedRoles: true,
  canReactivate: true,
  canRemove: true,
});

export const AUTHZ_PERMISSION_LIFECYCLE_PHASES = Object.freeze({
  PHASE_1: Object.freeze(['create', 'deprecate', 'listLinkedRoles', 'reactivate', 'remove'] as const),
  PHASE_2: Object.freeze([] as const),
}) satisfies Readonly<Record<AuthzPermissionLifecyclePhase, readonly AuthzPermissionLifecycleOperation[]>>;

export const AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS = 501;

export const AUTHZ_PERMISSION_STATUS_LABELS: Readonly<Record<AuthzPermissionStatus, string>> = Object.freeze({
  ACTIVE: 'Ativa',
  DEPRECATED: 'Depreciada',
  DISABLED: 'Removida',
});

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

export function buildPermissionOperationUnavailableBody(
  operation: UnsupportedAuthzPermissionLifecycleOperation,
): PermissionOperationUnavailableBody {
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
