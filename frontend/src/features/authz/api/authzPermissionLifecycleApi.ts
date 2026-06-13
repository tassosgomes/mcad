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
 * The BFF aggregates data via fan-out: GET /v1/roles + GET /v1/roles/{id}/permissions.
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
 * Phase 2 — creates a new permission via the BFF.
 *
 * The BFF currently returns 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE because
 * ecad-authz does not yet expose POST /v1/permissions.
 * This function is provided so that pages can wire up the mutation and handle
 * the unavailable error gracefully without structural rework when Phase 2 ships.
 */
export async function createPermission(input: CreatePermissionInput): Promise<Permission> {
  return bffPost<Permission>('/autorizacao/permissoes', input);
}

/**
 * Phase 2 — reactivates a deprecated permission via the BFF.
 *
 * The BFF currently returns 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE because
 * ecad-authz does not yet expose POST /v1/permissions/{id}/reactivate.
 */
export async function reactivatePermission(permissionId: string): Promise<Permission> {
  return bffPost<Permission>(
    `/autorizacao/permissoes/${encodeURIComponent(permissionId)}/reativar`,
  );
}

/**
 * Phase 2 — logically removes a deprecated, unlinked permission via the BFF.
 *
 * The BFF currently returns 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE because
 * ecad-authz does not yet expose POST /v1/permissions/{id}/remove.
 *
 * @param confirmationText Must be exactly "CONFIRMO" to satisfy future BFF validation.
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
