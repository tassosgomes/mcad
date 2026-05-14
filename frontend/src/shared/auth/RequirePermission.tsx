import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@shared/authz';
import { ErrorState } from '@components/ui/error-state';

interface RequirePermissionProps {
  /** Single required permission. */
  permission?: string;
  /** Allowed when the subject has at least one of the permissions. */
  anyOf?: string[];
  /** Allowed when the subject has all of the permissions. */
  allOf?: string[];
  /**
   * Rendered when the user is not allowed. When omitted, the component
   * redirects to `/` (the application root). Pass `null` to render nothing.
   */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Route guard that authorizes access based on permissions exposed by the
 * `PermissionsProvider`. Aligns the frontend with the backend's permission
 * vocabulary.
 *
 * Authorization rules:
 * - `permission` — subject must have exactly this permission.
 * - `anyOf`      — subject must have at least one of the listed permissions.
 * - `allOf`      — subject must have all of the listed permissions.
 *
 * Only the first non-empty rule (in the order above) is evaluated. When none
 * is provided the guard denies access — callers must opt-in explicitly.
 */
export function RequirePermission({
  permission,
  anyOf,
  allOf,
  fallback,
  children,
}: RequirePermissionProps) {
  const { can, hasAny, hasAll, isLoading } = usePermissions();

  if (isLoading) {
    // Keep the tree empty until permissions resolve to avoid flashing the
    // fallback when the user is still loading.
    return null;
  }

  let allowed = false;
  if (permission) {
    allowed = can(permission);
  } else if (anyOf && anyOf.length > 0) {
    allowed = hasAny(anyOf);
  } else if (allOf && allOf.length > 0) {
    allowed = hasAll(allOf);
  }

  if (!allowed) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Default access-denied UI for use as a `RequirePermission` fallback.
 */
export function PermissionDeniedFallback() {
  return (
    <ErrorState message="Acesso negado. Você não tem permissão para acessar esta área." />
  );
}
