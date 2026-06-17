import { Badge } from '@components/ui/badge';
import type { StatusPagamento } from '../types/pagamento';

interface StatusBadgePagamentoProps {
  status: StatusPagamento;
}

const STATUS_VARIANT: Record<StatusPagamento, 'success' | 'error' | 'warning'> = {
  BOLETO_EMITIDO: 'warning',
  CONFIRMADO: 'success',
  ESTORNADO: 'error',
};

const STATUS_LABEL: Record<StatusPagamento, string> = {
  BOLETO_EMITIDO: 'Boleto emitido',
  CONFIRMADO: 'Confirmado',
  ESTORNADO: 'Estornado',
};

export function StatusBadgePagamento({ status }: StatusBadgePagamentoProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
