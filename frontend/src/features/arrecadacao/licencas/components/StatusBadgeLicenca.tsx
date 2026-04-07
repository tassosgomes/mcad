import { Badge } from '@components/ui/badge';
import type { StatusLicenca } from '../types/licenca';

interface StatusBadgeLicencaProps {
  status: StatusLicenca;
}

const STATUS_VARIANT: Record<StatusLicenca, 'success' | 'warning' | 'muted'> = {
  ATIVA: 'success',
  SUSPENSA: 'warning',
  ENCERRADA: 'muted',
};

const STATUS_LABEL: Record<StatusLicenca, string> = {
  ATIVA: 'Ativa',
  SUSPENSA: 'Suspensa',
  ENCERRADA: 'Encerrada',
};

export function StatusBadgeLicenca({ status }: StatusBadgeLicencaProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
