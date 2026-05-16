import type { Disponibilidade } from '../types/processo';
import styles from './DisponibilidadeList.module.css';

interface DisponibilidadeListProps {
  items: Disponibilidade[];
  onSelect: (item: Disponibilidade) => void;
  isCreating: boolean;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function DisponibilidadeList({ items, onSelect, isCreating }: DisponibilidadeListProps) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhuma combinação disponível para distribuição.</p>
        <span className={styles.emptyHint}>
          É necessário que exista um Rol de Execuções fechado e uma Verba disponível para a rubrica e período.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <button
          key={`${item.rubrica.sigla}-${item.periodo}`}
          className={styles.card}
          onClick={() => onSelect(item)}
          disabled={isCreating}
          type="button"
          aria-label={`Criar processo para ${item.rubrica.nome} — ${item.periodo}`}
        >
          <div className={styles.cardHeader}>
            <span className={styles.chip}>{item.rubrica.sigla}</span>
            <span className={styles.rubricaNome}>{item.rubrica.nome}</span>
            <span className={styles.periodo}>{item.periodo}</span>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Verba Líquida</span>
              <span className={styles.metricValue}>{formatBRL(item.verbaLiquida)}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Total Execuções</span>
              <span className={styles.metricValue}>{item.totalExecucoes.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
