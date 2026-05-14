import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addPermissionToRole,
  createRole,
  deactivateRole,
  getRole,
  listRolePermissions,
  listRoles,
  removePermissionFromRole,
  updateRole,
} from '../api/authzRolesApi';
import type { RoleCreateRequest, RoleFilters, RoleUpdateRequest } from '../types/role';

export const rolesQueryKey = ['authz', 'roles'] as const;

export function useRolesCatalog(filters: RoleFilters, page: number, size: number) {
  return useQuery({
    queryKey: [...rolesQueryKey, filters, page, size],
    queryFn: () => listRoles({ ...filters, page, size }),
  });
}

export function useRoleDetails(roleId: string | null) {
  return useQuery({
    queryKey: ['authz', 'role', roleId],
    queryFn: () => getRole(roleId ?? ''),
    enabled: roleId !== null,
  });
}

export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ['authz', 'role-permissions', roleId],
    queryFn: () => listRolePermissions(roleId ?? ''),
    enabled: roleId !== null,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RoleCreateRequest) => createRole(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rolesQueryKey });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, payload }: { roleId: string; payload: RoleUpdateRequest }) =>
      updateRole(roleId, payload),
    onSuccess: async (role) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rolesQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['authz', 'role', role.id] }),
      ]);
    },
  });
}

export function useDeactivateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateRole,
    onSuccess: async (role) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rolesQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['authz', 'role', role.id] }),
      ]);
    },
  });
}

export function useAddPermissionToRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionKey }: { roleId: string; permissionKey: string }) =>
      addPermissionToRole(roleId, permissionKey),
    onSuccess: async (_permission, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rolesQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['authz', 'role-permissions', variables.roleId] }),
      ]);
    },
  });
}

export function useRemovePermissionFromRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      removePermissionFromRole(roleId, permissionId),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rolesQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['authz', 'role-permissions', variables.roleId] }),
      ]);
    },
  });
}
