import { Badge } from '@components/ui/badge';
import type { PermissionStatus } from '../types/permission';

const STATUS_VARIANT = {
  ACTIVE: 'success',
  DEPRECATED: 'warning',
  DISABLED: 'muted',
} as const;

const STATUS_LABEL: Record<PermissionStatus, string> = {
  ACTIVE: 'Ativa',
  DEPRECATED: 'Depreciada',
  DISABLED: 'Desabilitada',
};

export function PermissionStatusBadge({ status }: { status: PermissionStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
