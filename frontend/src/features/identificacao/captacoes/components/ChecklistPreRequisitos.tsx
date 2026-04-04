import styles from './ChecklistPreRequisitos.module.css';
import type { PreRequisitosResponse } from '../types/fechamento';

interface ChecklistPreRequisitosProps {
  data: PreRequisitosResponse;
}

export function ChecklistPreRequisitos({ data }: ChecklistPreRequisitosProps) {
  const { itens, resumo } = data;

  return (
    <div className={styles.container}>
      <div className={styles.checklist}>
        {itens.map((item) => (
          <div key={item.id} className={`${styles.item} ${item.atendido ? styles.ok : styles.falha}`}>
            <span className={styles.icon}>{item.atendido ? '✅' : '❌'}</span>
            <div className={styles.content}>
              <span className={styles.nome}>{item.nome}</span>
              {!item.atendido && item.detalhe && (
                <span className={styles.detalhe}>{item.detalhe}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.resumo}>
        <div className={styles.resumoTitle}>Resumo da Captação</div>
        <div className={styles.resumoGrid}>
          <div className={styles.resumoItem}>
            <span className={styles.resumoLabel}>Total</span>
            <span className={styles.resumoValue}>{resumo.totalExecucoes}</span>
          </div>
          <div className={styles.resumoItem}>
            <span className={styles.resumoLabel}>Identificadas</span>
            <span className={styles.resumoValue}>{resumo.identificadas}</span>
          </div>
          <div className={styles.resumoItem}>
            <span className={styles.resumoLabel}>Pendentes</span>
            <span className={styles.resumoValue}>{resumo.pendentes}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
