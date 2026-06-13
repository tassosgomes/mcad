import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPermission,
  deprecatePermissionGoverned,
  getPermissionLinkedRoles,
  reactivatePermission,
  removePermission,
} from '../api/authzPermissionLifecycleApi';
import {
  AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES,
  isPermissionLifecycleOperationAvailable,
  type AuthzPermissionLifecycleOperation,
} from '../contract/authzPermissionLifecycleContract';
import type { CreatePermissionInput } from '../types/permission';
import { permissionsQueryKey } from './usePermissionsCatalog';

export const linkedRolesQueryKey = ['authz', 'permission-linked-roles'] as const;

/**
 * Returns the static capability matrix from the local contract.
 *
 * Exposed as a hook for consistency and to allow future migration to a
 * dynamic BFF endpoint without changing call sites.
 */
export function usePermissionLifecycleCapabilities() {
  return AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES;
}

/**
 * Returns whether a specific lifecycle operation is available based on the
 * current Phase 1 / Phase 2 capability matrix in the local contract.
 */
export function usePermissionOperationAvailable(
  operation: AuthzPermissionLifecycleOperation,
): boolean {
  return isPermissionLifecycleOperationAvailable(operation);
}

/**
 * Fetches linked roles and removal eligibility for a permission.
 *
 * Calls GET /api/autorizacao/permissoes/:id/papeis-vinculados via BFF.
 * Skips the request when permissionId is null.
 */
export function usePermissionLinkedRoles(permissionId: string | null) {
  return useQuery({
    queryKey: [...linkedRolesQueryKey, permissionId],
    queryFn: () => getPermissionLinkedRoles(permissionId ?? ''),
    enabled: permissionId !== null,
  });
}

/**
 * Governed BFF mutation for deprecating a permission.
 *
 * Calls POST /api/autorizacao/permissoes/:id/depreciar (audited wrapper).
 * Invalidates the permissions catalog, the permission detail, and the linked
 * roles cache on success.
 */
export function useDeprecatePermissionGoverned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deprecatePermissionGoverned,
    onSuccess: async (permission) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: permissionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['authz', 'permission', permission.id] }),
        queryClient.invalidateQueries({ queryKey: linkedRolesQueryKey }),
      ]);
    },
  });
}

/**
 * Phase 2 stub — creates a new permission via the BFF.
 *
 * The BFF returns 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE until
 * ecad-authz exposes POST /v1/permissions. Pages should check
 * `isPermissionOperationUnavailableError(error)` to display the correct message.
 */
export function useCreatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePermissionInput) => createPermission(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: permissionsQueryKey });
    },
  });
}

/**
 * Phase 2 stub — reactivates a deprecated permission via the BFF.
 *
 * The BFF returns 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE until
 * ecad-authz exposes POST /v1/permissions/{id}/reactivate.
 */
export function useReactivatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reactivatePermission,
    onSuccess: async (permission) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: permissionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['authz', 'permission', permission.id] }),
        queryClient.invalidateQueries({ queryKey: linkedRolesQueryKey }),
      ]);
    },
  });
}

/**
 * Phase 2 stub — logically removes a deprecated, unlinked permission via the BFF.
 *
 * The BFF returns 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE until
 * ecad-authz exposes POST /v1/permissions/{id}/remove.
 */
export function useRemovePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      permissionId,
      confirmationText,
    }: {
      permissionId: string;
      confirmationText: string;
    }) => removePermission(permissionId, confirmationText),
    onSuccess: async (permission) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: permissionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['authz', 'permission', permission.id] }),
        queryClient.invalidateQueries({ queryKey: linkedRolesQueryKey }),
      ]);
    },
  });
}
