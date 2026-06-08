import { Badge } from '@components/ui/badge';
import type { BadgeVariant } from '@components/ui/badge';
import type { AjusteEstornoStatus } from '../types/ajusteEstorno';

interface AjusteEstornoStatusBadgeProps {
  status: AjusteEstornoStatus;
}

const STATUS_VARIANT: Record<AjusteEstornoStatus, BadgeVariant> = {
  PENDENTE_APLICACAO: 'accent',
  PREVISTO: 'warning',
  APLICADO: 'success',
  CANCELADO: 'muted',
  IGNORADO_SEM_DISTRIBUICAO: 'muted',
  PROCESSO_CRIADO_DESATUALIZADO: 'warning',
  ERRO_INTEGRIDADE: 'error',
};

const STATUS_LABEL: Record<AjusteEstornoStatus, string> = {
  PENDENTE_APLICACAO: 'Pendente',
  PREVISTO: 'Previsto',
  APLICADO: 'Aplicado',
  CANCELADO: 'Cancelado',
  IGNORADO_SEM_DISTRIBUICAO: 'Ignorado',
  PROCESSO_CRIADO_DESATUALIZADO: 'Desatualizado',
  ERRO_INTEGRIDADE: 'Erro',
};

export function AjusteEstornoStatusBadge({ status }: AjusteEstornoStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'muted'}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
