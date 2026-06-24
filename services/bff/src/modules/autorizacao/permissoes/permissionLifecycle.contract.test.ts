import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES,
  AUTHZ_PERMISSION_LIFECYCLE_PHASES,
  AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS,
  AUTHZ_PERMISSION_STATUS_LABELS,
  buildPermissionOperationUnavailableBody,
  isPermissionLifecycleOperationAvailable,
} from './permissionLifecycle.contract.js';

test('authz permission lifecycle contract exposes the final capability matrix', () => {
  assert.deepEqual(AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES, {
    canCreate: true,
    canDeprecate: true,
    canListLinkedRoles: true,
    canReactivate: true,
    canRemove: true,
  });
  assert.equal(isPermissionLifecycleOperationAvailable('deprecate'), true);
  assert.equal(isPermissionLifecycleOperationAvailable('listLinkedRoles'), true);
  assert.equal(isPermissionLifecycleOperationAvailable('create'), true);
  assert.equal(isPermissionLifecycleOperationAvailable('reactivate'), true);
  assert.equal(isPermissionLifecycleOperationAvailable('remove'), true);
});

test('authz permission lifecycle contract maps DISABLED to the Removida label', () => {
  assert.equal(AUTHZ_PERMISSION_STATUS_LABELS.DISABLED, 'Removida');
});

test('authz permission lifecycle contract keeps the legacy unavailable error payload stable', () => {
  assert.equal(AUTHZ_PERMISSION_OPERATION_UNAVAILABLE_STATUS, 501);
  assert.deepEqual(AUTHZ_PERMISSION_LIFECYCLE_PHASES.PHASE_1, [
    'create',
    'deprecate',
    'listLinkedRoles',
    'reactivate',
    'remove',
  ]);
  assert.deepEqual(AUTHZ_PERMISSION_LIFECYCLE_PHASES.PHASE_2, []);
  assert.deepEqual(buildPermissionOperationUnavailableBody('reactivate'), {
    code: 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE',
    message:
      'Operacao indisponivel no momento: o ecad-authz ainda nao expoe POST /v1/permissions/{permissionId}/reactivate.',
    operation: 'reactivate',
    upstream: 'ecad-authz',
    missingEndpoint: 'POST /v1/permissions/{permissionId}/reactivate',
    phase: 'PHASE_2',
  });
});
