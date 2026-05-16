import { Badge } from '@components/ui/badge';
import type { BadgeVariant } from '@components/ui/badge';
import type { StatusProcesso } from '../types/processo';

interface ProcessoStatusBadgeProps {
  status: StatusProcesso;
}

const STATUS_VARIANT: Record<StatusProcesso, BadgeVariant> = {
  CRIADO: 'accent',
  CALCULADO: 'warning',
  APROVADO: 'success',
  FINALIZADO: 'secondary',
  CANCELADO: 'error',
};

const STATUS_LABEL: Record<StatusProcesso, string> = {
  CRIADO: 'Criado',
  CALCULADO: 'Calculado',
  APROVADO: 'Aprovado',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export function ProcessoStatusBadge({ status }: ProcessoStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
