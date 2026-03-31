import { Badge } from '@components/ui/badge';
import styles from './SomaIndicator.module.css';

interface SomaIndicatorProps {
  soma: number;
  completa: boolean;
}

export function SomaIndicator({ soma, completa }: SomaIndicatorProps) {
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
