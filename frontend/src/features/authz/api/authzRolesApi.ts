import { authzGet, authzPost } from '@services/apiAuthzClient';
import type { PermissionSummary } from '../types/permission';
import type { Role, RoleCreateRequest, RoleFilters, RolePage } from '../types/role';

export interface ListRolesParams extends RoleFilters {
  page: number;
  size: number;
}

function appendIfPresent(params: URLSearchParams, key: string, value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue) {
    params.set(key, trimmedValue);
  }
}

export async function listRoles(params: ListRolesParams): Promise<RolePage> {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
    sort: 'key,asc',
  });

  appendIfPresent(query, 'domain', params.domain);
  appendIfPresent(query, 'area', params.area);
  appendIfPresent(query, 'status', params.status);
  appendIfPresent(query, 'q', params.q);

  return authzGet<RolePage>(`/roles?${query.toString()}`);
}

export async function createRole(payload: RoleCreateRequest): Promise<Role> {
  return authzPost<Role>('/roles', payload);
}

export async function addPermissionToRole(
  roleId: string,
  permissionKey: string,
): Promise<PermissionSummary> {
  return authzPost<PermissionSummary>(`/roles/${encodeURIComponent(roleId)}/permissions`, {
    permissionKey,
  });
}
