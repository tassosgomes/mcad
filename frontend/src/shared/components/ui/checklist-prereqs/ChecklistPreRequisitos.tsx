import { PreRequisitoItem } from '@/features/cadastro/obras/types/obra';
import { CheckCircle, XCircle } from 'lucide-react';
import styles from './checklist-prereqs.module.css';

interface ChecklistProps {
  pendencias: PreRequisitoItem[];
}

export function ChecklistPreRequisitos({ pendencias }: ChecklistProps) {
  if (!pendencias || pendencias.length === 0) return null;
  
  return (
    <div className={styles.checklist}>
      <h4 className={styles.title}>Pré-requisitos para liberação</h4>
      <div className={styles.list}>
        {pendencias.map(p => (
          <div key={p.item} className={`${styles.item} ${p.atendido ? styles.ok : styles.pendente}`}>
            {p.atendido ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span className={styles.itemName}>{p.item}</span>
            {p.detalhe && <span className={styles.detalhe}>— {p.detalhe}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
