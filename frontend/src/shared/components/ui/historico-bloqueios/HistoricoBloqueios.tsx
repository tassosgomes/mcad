import { Badge } from '../badge';
import styles from './historico-bloqueios.module.css';
import { HistoricoBloqueioItem } from '@/features/cadastro/obras/types/obra';

interface HistoricoProps {
  items: HistoricoBloqueioItem[];
}

export function HistoricoBloqueios({ items }: HistoricoProps) {
  if (!items || items.length === 0) return null;

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString('pt-BR');
  };

  return (
    <div className={styles.historico}>
      <h3 className={styles.title}>Histórico de Bloqueios</h3>
      <div className={styles.timeline}>
        {items.map(item => (
          <div key={item.id} className={styles.entry}>
            <div className={styles.header}>
              <Badge variant={item.acao === 'BLOQUEIO' ? 'error' : 'success'}>
                {item.acao === 'BLOQUEIO' ? 'Bloqueio' : 'Desbloqueio'}
              </Badge>
              <span className={styles.data}>{formatDateTime(item.dataHora)}</span>
            </div>
            {item.justificativa && (
              <p className={styles.justificativa}>{item.justificativa}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
