import { Badge, type BadgeVariant } from '@components/ui/badge';
import type { AuditEventType } from '../types/audit-event';

const VARIANT_BY_TYPE: Record<AuditEventType, BadgeVariant> = {
  DATA_CHANGE: 'accent',
  SCREEN_ACCESS: 'secondary',
  USER_ACTION: 'warning',
};

const LABEL_BY_TYPE: Record<AuditEventType, string> = {
  DATA_CHANGE: 'Alteração',
  SCREEN_ACCESS: 'Acesso',
  USER_ACTION: 'Ação',
};

export function AuditEventTypeBadge({ eventType }: { eventType: AuditEventType }) {
  return <Badge variant={VARIANT_BY_TYPE[eventType]}>{LABEL_BY_TYPE[eventType]}</Badge>;
}
