import type { StatusVerba } from '../types/verba';
import styles from './StatusBadgeVerba.module.css';

interface StatusBadgeVerbaProps {
  status: StatusVerba;
}

const STATUS_CLASS: Record<StatusVerba, string> = {
  ABERTA: styles.aberta,
  EM_DISTRIBUICAO: styles.emDistribuicao,
  DISTRIBUIDA: styles.distribuida,
};

const STATUS_LABEL: Record<StatusVerba, string> = {
  ABERTA: 'Aberta',
  EM_DISTRIBUICAO: 'Em Distribuição',
  DISTRIBUIDA: 'Distribuída',
};

export function StatusBadgeVerba({ status }: StatusBadgeVerbaProps) {
  return (
    <span className={`${styles.badge} ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
