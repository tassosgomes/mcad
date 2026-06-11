import { describe, expect, it } from 'vitest';
import {
  AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES,
  AUTHZ_PERMISSION_LIFECYCLE_PHASES,
  AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS,
  buildPermissionOperationUnavailableError,
  getPermissionStatusLabel,
  isPermissionLifecycleOperationAvailable,
  PERMISSION_STATUS_FILTER_OPTIONS,
} from './authzPermissionLifecycleContract';

describe('authzPermissionLifecycleContract', () => {
  it('exposes the fail-closed capability matrix agreed for phase 1', () => {
    expect(AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES).toEqual({
      canCreate: false,
      canDeprecate: true,
      canListLinkedRoles: true,
      canReactivate: false,
      canRemove: false,
    });
    expect(isPermissionLifecycleOperationAvailable('deprecate')).toBe(true);
    expect(isPermissionLifecycleOperationAvailable('listLinkedRoles')).toBe(true);
    expect(isPermissionLifecycleOperationAvailable('create')).toBe(false);
    expect(isPermissionLifecycleOperationAvailable('reactivate')).toBe(false);
    expect(isPermissionLifecycleOperationAvailable('remove')).toBe(false);
  });

  it('maps the official DISABLED status to the Removida business label', () => {
    expect(getPermissionStatusLabel('DISABLED')).toBe('Removida');
    expect(PERMISSION_STATUS_FILTER_OPTIONS).toContainEqual({
      value: 'DISABLED',
      label: 'Removidas',
    });
  });

  it('documents unsupported upstream operations with a stable local error shape', () => {
    expect(AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS).toBe(501);
    expect(AUTHZ_PERMISSION_LIFECYCLE_PHASES.PHASE_1).toEqual(['deprecate', 'listLinkedRoles']);
    expect(AUTHZ_PERMISSION_LIFECYCLE_PHASES.PHASE_2).toEqual(['create', 'reactivate', 'remove']);

    expect(buildPermissionOperationUnavailableError('remove')).toEqual({
      code: 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE',
      message:
        'Operacao indisponivel no momento: o ecad-authz ainda nao expoe POST /v1/permissions/{permissionId}/remove.',
      operation: 'remove',
      upstream: 'ecad-authz',
      missingEndpoint: 'POST /v1/permissions/{permissionId}/remove',
      phase: 'PHASE_2',
    });
  });
});
