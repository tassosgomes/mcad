import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deprecatePermission, getPermission, listPermissions } from '../api/authzPermissionsApi';
import type { PermissionFilters } from '../types/permission';

export const permissionsQueryKey = ['authz', 'permissions'] as const;

export function usePermissionsCatalog(
  filters: PermissionFilters,
  page: number,
  size: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [...permissionsQueryKey, filters, page, size],
    queryFn: () => listPermissions({ ...filters, page, size }),
    enabled,
  });
}

export function usePermissionDetails(permissionId: string | null) {
  return useQuery({
    queryKey: ['authz', 'permission', permissionId],
    queryFn: () => getPermission(permissionId ?? ''),
    enabled: permissionId !== null,
  });
}

export function useDeprecatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deprecatePermission,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: permissionsQueryKey });
    },
  });
}
