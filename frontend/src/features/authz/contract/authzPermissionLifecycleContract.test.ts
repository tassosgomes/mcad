import { describe, expect, it } from 'vitest';
import {
  AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES,
  AUTHZ_PERMISSION_LIFECYCLE_PHASES,
  AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS,
  buildPermissionOperationUnavailableError,
  getPermissionStatusLabel,
  isPermissionLifecycleOperationAvailable,
  isPermissionOperationUnavailableError,
  PERMISSION_STATUS_FILTER_OPTIONS,
} from './authzPermissionLifecycleContract';

describe('authzPermissionLifecycleContract', () => {
  it('exposes the final capability matrix after upstream lifecycle endpoints were published', () => {
    expect(AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES).toEqual({
      canCreate: true,
      canDeprecate: true,
      canListLinkedRoles: true,
      canReactivate: true,
      canRemove: true,
    });
    expect(isPermissionLifecycleOperationAvailable('deprecate')).toBe(true);
    expect(isPermissionLifecycleOperationAvailable('listLinkedRoles')).toBe(true);
    expect(isPermissionLifecycleOperationAvailable('create')).toBe(true);
    expect(isPermissionLifecycleOperationAvailable('reactivate')).toBe(true);
    expect(isPermissionLifecycleOperationAvailable('remove')).toBe(true);
  });

  it('maps the official DISABLED status to the Removida business label', () => {
    expect(getPermissionStatusLabel('DISABLED')).toBe('Removida');
    expect(PERMISSION_STATUS_FILTER_OPTIONS).toContainEqual({
      value: 'DISABLED',
      label: 'Removidas',
    });
  });

  it('keeps the legacy unavailable error helper stable for defensive handling', () => {
    expect(AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS).toBe(501);
    expect(AUTHZ_PERMISSION_LIFECYCLE_PHASES.PHASE_1).toEqual([
      'create',
      'deprecate',
      'listLinkedRoles',
      'reactivate',
      'remove',
    ]);
    expect(AUTHZ_PERMISSION_LIFECYCLE_PHASES.PHASE_2).toEqual([]);

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

  it('isPermissionOperationUnavailableError correctly identifies the error shape', () => {
    const unavailableError = buildPermissionOperationUnavailableError('create');
    expect(isPermissionOperationUnavailableError(unavailableError)).toBe(true);

    // BFF throws the body merged with status/path — the guard must work on that shape too
    expect(
      isPermissionOperationUnavailableError({
        code: 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE',
        status: 501,
        path: '/autorizacao/permissoes',
      }),
    ).toBe(true);

    expect(isPermissionOperationUnavailableError(null)).toBe(false);
    expect(isPermissionOperationUnavailableError(undefined)).toBe(false);
    expect(isPermissionOperationUnavailableError({ code: 'OTHER_ERROR' })).toBe(false);
    expect(isPermissionOperationUnavailableError('string error')).toBe(false);
  });
});
