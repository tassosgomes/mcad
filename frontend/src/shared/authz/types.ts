/**
 * Permission strings follow the convention `<domain>:<resource>:<action>`,
 * e.g. `cadastro:obra:criar`. The frontend treats them as opaque tokens —
 * matching is done by exact string equality.
 *
 * Permissions surfaced here are only consumed for UX (show/hide elements).
 * The backend (authz + each domain API) remains the source of truth for
 * authorization decisions.
 */
export type Permission = string;

export interface PermissionsResponse {
  subjectId: string;
  permissions: Permission[];
  version: number;
}

export interface PermissionsState {
  permissions: Set<Permission>;
  version: number | null;
  isLoading: boolean;
  error: unknown;
  can: (permission: Permission) => boolean;
  hasAny: (permissions: Permission[]) => boolean;
  hasAll: (permissions: Permission[]) => boolean;
  reload: () => void;
}

export class PermissionsUnauthorizedError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, code?: string, message?: string) {
    super(message ?? `Permissions request failed with status ${status}`);
    this.name = 'PermissionsUnauthorizedError';
    this.status = status;
    this.code = code;
  }
}
