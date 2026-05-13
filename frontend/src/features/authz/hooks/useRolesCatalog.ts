import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addPermissionToRole, createRole, listRoles } from '../api/authzRolesApi';
import type { RoleCreateRequest, RoleFilters } from '../types/role';

export const rolesQueryKey = ['authz', 'roles'] as const;

export function useRolesCatalog(filters: RoleFilters, page: number, size: number) {
  return useQuery({
    queryKey: [...rolesQueryKey, filters, page, size],
    queryFn: () => listRoles({ ...filters, page, size }),
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
