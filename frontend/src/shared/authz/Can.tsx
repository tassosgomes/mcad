import type { ReactNode } from 'react';
import { usePermissions } from './usePermissions';

export interface CanProps {
  /** Single required permission. */
  permission?: string;
  /** Visible when the subject has at least one of the permissions. */
  anyOf?: string[];
  /** Visible when the subject has all of the permissions. */
  allOf?: string[];
  /** Rendered when the user is not allowed. Defaults to `null`. */
  fallback?: ReactNode;
  /** Rendered while permissions are loading. Defaults to `null`. */
  loading?: ReactNode;
  children: ReactNode;
}

function evaluate(
  state: ReturnType<typeof usePermissions>,
  permission: string | undefined,
  anyOf: string[] | undefined,
  allOf: string[] | undefined,
): boolean {
  // When no constraints are provided, the gate is permissive.
  if (!permission && (!anyOf || anyOf.length === 0) && (!allOf || allOf.length === 0)) {
    return true;
  }

  if (permission && !state.can(permission)) {
    return false;
  }

  if (anyOf && anyOf.length > 0 && !state.hasAny(anyOf)) {
    return false;
  }

  if (allOf && allOf.length > 0 && !state.hasAll(allOf)) {
    return false;
  }

  return true;
}

/**
 * Conditionally renders `children` when the current subject has the required
 * permissions. Strictly a UX helper — never use this in place of backend
 * authorization checks.
 */
export function Can({
  permission,
  anyOf,
  allOf,
  fallback = null,
  loading = null,
  children,
}: CanProps) {
  const state = usePermissions();

  if (state.isLoading && state.permissions.size === 0) {
    return <>{loading}</>;
  }

  return evaluate(state, permission, anyOf, allOf) ? <>{children}</> : <>{fallback}</>;
}
