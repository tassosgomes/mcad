import { Badge, type BadgeVariant } from '@components/ui/badge';
import type { AuditDataAction, AuditEventType } from '../types/audit-event';

const TYPE_VARIANT: Record<AuditEventType, BadgeVariant> = {
  DATA_CHANGE: 'accent',
  SCREEN_ACCESS: 'secondary',
  USER_ACTION: 'warning',
};

const TYPE_LABEL: Record<AuditEventType, string> = {
  DATA_CHANGE: 'Alteração',
  SCREEN_ACCESS: 'Visualização',
  USER_ACTION: 'Ação',
};

const ACTION_VARIANT: Record<AuditDataAction, BadgeVariant> = {
  CREATE: 'success',
  UPDATE: 'accent',
  DELETE: 'error',
};

const ACTION_LABEL: Record<AuditDataAction, string> = {
  CREATE: 'Criou',
  UPDATE: 'Atualizou',
  DELETE: 'Excluiu',
};

export interface AuditEventTypeBadgeProps {
  eventType: AuditEventType;
  action?: string | null;
}

export function AuditEventTypeBadge({ eventType, action }: AuditEventTypeBadgeProps) {
  if (eventType === 'DATA_CHANGE' && action && action in ACTION_LABEL) {
    const key = action as AuditDataAction;
    return <Badge variant={ACTION_VARIANT[key]}>{ACTION_LABEL[key]}</Badge>;
  }
  return <Badge variant={TYPE_VARIANT[eventType]}>{TYPE_LABEL[eventType]}</Badge>;
}
