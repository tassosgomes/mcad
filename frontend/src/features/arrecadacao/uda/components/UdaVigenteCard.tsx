import { AlertTriangle } from 'lucide-react';
import { Button } from '@components/ui/button';
import { useUdaVigente } from '../hooks/useUdaVigente';
import { formatBRL } from '../../shared/utils/formatCurrency';
import styles from './UdaVigenteCard.module.css';

interface UdaVigenteCardProps {
  onAjustar: () => void;
  isAnalista: boolean;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function UdaVigenteCard({ onAjustar, isAnalista }: UdaVigenteCardProps) {
  const { data: uda, isError, isLoading } = useUdaVigente();

  if (isLoading) {
    return <div className={styles.card}><span className={styles.loading}>Carregando...</span></div>;
  }

  if (isError || !uda) {
    return (
      <div className={`${styles.card} ${styles.alertCard}`}>
        <AlertTriangle size={20} className={styles.alertIcon} />
        <span className={styles.alertText}>Nenhum valor de UDA configurado</span>
        {isAnalista && (
          <Button variant="primary" onClick={onAjustar} id="btn-ajustar-uda" type="button">
            Configurar UDA
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>Valor Vigente da UDA</span>
        {isAnalista && (
          <Button variant="secondary" size="sm" onClick={onAjustar} id="btn-ajustar-uda" type="button">
            Ajustar Valor
          </Button>
        )}
      </div>
      <div className={styles.valorDestaque}>{formatBRL(uda.valor)}</div>
      <span className={styles.vigencia}>Vigente desde {formatDate(uda.dataVigencia)}</span>
      {uda.criadoPor && (
        <span className={styles.meta}>Configurado por {uda.criadoPor}</span>
      )}
    </div>
  );
}
