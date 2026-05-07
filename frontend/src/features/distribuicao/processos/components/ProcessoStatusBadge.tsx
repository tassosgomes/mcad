import { Badge } from '@components/ui/badge';
import type { StatusProcesso } from '../types/calculo';
import { formatStatusProcesso } from '../utils/calculoFormatters';

interface ProcessoStatusBadgeProps {
  status: StatusProcesso;
}

export function ProcessoStatusBadge({ status }: ProcessoStatusBadgeProps) {
  const variant = status === 'CALCULADO' || status === 'APROVADO'
    ? 'success'
    : status === 'CRIADO'
      ? 'warning'
      : 'muted';

  return (
    <Badge variant={variant} mono>
      {formatStatusProcesso(status)}
    </Badge>
  );
}
