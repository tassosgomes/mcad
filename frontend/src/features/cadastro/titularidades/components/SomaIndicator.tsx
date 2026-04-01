import { Badge } from '@components/ui/badge';
import styles from './SomaIndicator.module.css';

interface SomaIndicatorProps {
  soma: number;
  completa: boolean;
  /** Se true, exibe "Pendente" (esperando cálculo) ao invés de valor numérico */
  pendente?: boolean;
}

export function SomaIndicator({ soma, completa, pendente }: SomaIndicatorProps) {
  if (pendente) {
    return (
      <div className={styles.indicator}>
        <span className={styles.label}>Total:</span>
        <Badge variant="secondary" mono>Pendente</Badge>
        <span className={styles.hint}>Execute "Calcular Percentuais" para distribuir automaticamente</span>
      </div>
    );
  }

  const variant = completa ? 'success' : soma > 100 ? 'error' : 'warning';

  return (
    <div className={styles.indicator}>
      <span className={styles.label}>Total:</span>
      <Badge variant={variant} mono>
        {soma.toFixed(4)}%
      </Badge>
      {!completa && soma < 100 && soma > 0 && (
        <span className={styles.hint}>Faltam {(100 - soma).toFixed(4)}%</span>
      )}
      {!completa && soma === 0 && (
        <span className={styles.hint}>Nenhuma titularidade cadastrada</span>
      )}
      {soma > 100 && (
        <span className={styles.hintError}>Excede em {(soma - 100).toFixed(4)}%</span>
      )}
    </div>
  );
}
