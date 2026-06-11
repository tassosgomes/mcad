import { Badge } from '@components/ui/badge';
import type { PermissionStatus } from '../types/permission';
import { getPermissionStatusLabel } from '../contract/authzPermissionLifecycleContract';

const STATUS_VARIANT = {
  ACTIVE: 'success',
  DEPRECATED: 'warning',
  DISABLED: 'muted',
} as const;

export function PermissionStatusBadge({ status }: { status: PermissionStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{getPermissionStatusLabel(status)}</Badge>;
}
