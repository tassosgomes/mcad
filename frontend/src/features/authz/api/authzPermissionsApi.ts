import { authzGet, authzPatch } from '@services/apiAuthzClient';
import type { Permission, PermissionFilters, PermissionPage } from '../types/permission';

export interface ListPermissionsParams extends PermissionFilters {
  page: number;
  size: number;
}

function appendIfPresent(params: URLSearchParams, key: string, value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue) {
    params.set(key, trimmedValue);
  }
}

export async function listPermissions(params: ListPermissionsParams): Promise<PermissionPage> {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
    sort: 'key,asc',
  });

  appendIfPresent(query, 'domain', params.domain);
  appendIfPresent(query, 'area', params.area);
  appendIfPresent(query, 'service', params.service);
  appendIfPresent(query, 'status', params.status);
  appendIfPresent(query, 'q', params.q);

  return authzGet<PermissionPage>(`/permissions?${query.toString()}`);
}

export async function getPermission(permissionId: string): Promise<Permission> {
  return authzGet<Permission>(`/permissions/${encodeURIComponent(permissionId)}`);
}

export async function deprecatePermission(permissionId: string): Promise<Permission> {
  return authzPatch<Permission>(`/permissions/${encodeURIComponent(permissionId)}/deprecate`);
}
