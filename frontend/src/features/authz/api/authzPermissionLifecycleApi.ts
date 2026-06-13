import { bffGet, bffPost } from '@services/apiBffClient';
import type {
  CreatePermissionInput,
  Permission,
  PermissionRemovalEligibility,
} from '../types/permission';

/**
 * Fetches linked roles and removal eligibility for a given permission.
 *
 * Calls GET /api/autorizacao/permissoes/:id/papeis-vinculados on the BFF.
 * The BFF uses the official ecad-authz GET /v1/permissions/{permissionId}/roles endpoint.
 */
export async function getPermissionLinkedRoles(
  permissionId: string,
): Promise<PermissionRemovalEligibility> {
  return bffGet<PermissionRemovalEligibility>(
    `/autorizacao/permissoes/${encodeURIComponent(permissionId)}/papeis-vinculados`,
  );
}

/**
 * Governed BFF wrapper for permission deprecation.
 *
 * Calls POST /api/autorizacao/permissoes/:id/depreciar (audited by BFF).
 * The BFF forwards to PATCH /v1/permissions/{id}/deprecate on ecad-authz and
 * publishes a PERMISSION_LIFECYCLE audit event.
 */
export async function deprecatePermissionGoverned(permissionId: string): Promise<Permission> {
  return bffPost<Permission>(
    `/autorizacao/permissoes/${encodeURIComponent(permissionId)}/depreciar`,
  );
}

/**
 * Creates a new permission via the governed BFF wrapper.
 *
 * Calls POST /api/autorizacao/permissoes, which forwards to ecad-authz
 * POST /v1/permissions and returns the created ACTIVE permission.
 */
export async function createPermission(input: CreatePermissionInput): Promise<Permission> {
  return bffPost<Permission>('/autorizacao/permissoes', input);
}

/**
 * Reactivates a deprecated permission via the governed BFF wrapper.
 */
export async function reactivatePermission(permissionId: string): Promise<Permission> {
  return bffPost<Permission>(
    `/autorizacao/permissoes/${encodeURIComponent(permissionId)}/reativar`,
  );
}

/**
 * Logically removes a deprecated, unlinked permission via the governed BFF wrapper.
 *
 * @param confirmationText Must be exactly "CONFIRMO".
 */
export async function removePermission(
  permissionId: string,
  confirmationText: string,
): Promise<Permission> {
  return bffPost<Permission>(
    `/autorizacao/permissoes/${encodeURIComponent(permissionId)}/remover`,
    { confirmationText },
  );
}
