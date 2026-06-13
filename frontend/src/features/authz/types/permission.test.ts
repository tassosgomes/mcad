import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  CreatePermissionInput,
  LinkedRole,
  PermissionRemovalEligibility,
  PermissionStatus,
} from './permission';

describe('permission lifecycle types', () => {
  it('accepts the official authz status enum including DISABLED', () => {
    expectTypeOf<PermissionStatus>().toEqualTypeOf<'ACTIVE' | 'DEPRECATED' | 'DISABLED'>();

    const removedStatus: PermissionStatus = 'DISABLED';
    expect(removedStatus).toBe('DISABLED');
  });

  it('models create payloads and linked-role eligibility from the local contract', () => {
    const linkedRole = {
      id: 'role-1',
      key: 'cadastro.obras.analista',
      displayName: 'Analista de Obras',
      status: 'ACTIVE',
    } satisfies LinkedRole;

    const createInput = {
      key: 'cadastro:obras:obra:aprovar',
      displayName: 'Aprovar obra',
      description: 'Permite aprovar obras',
      domain: 'cadastro',
      area: 'obras',
      resource: 'obra',
      action: 'aprovar',
    } satisfies CreatePermissionInput;

    const eligibility = {
      permissionId: 'perm-1',
      permissionStatus: 'DISABLED',
      linkedRoles: [linkedRole],
      canRemove: false,
      blockingReason: 'ROLE_LINKS_PRESENT',
    } satisfies PermissionRemovalEligibility;

    expect(createInput.key).toBe('cadastro:obras:obra:aprovar');
    expect(eligibility.permissionStatus).toBe('DISABLED');
    expect(eligibility.linkedRoles[0].displayName).toBe('Analista de Obras');
  });
});
