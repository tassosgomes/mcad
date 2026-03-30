import { Pencil, Trash2, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import type { Titular, TitularStatus, TitularTipo } from '../types/titular';
import styles from './TitularesTable.module.css';

interface TitularesTableProps {
  data: Titular[];
  sort: string;
  onSortChange: (sort: string) => void;
  onEdit: (id: string) => void;
  onDelete: (titular: Titular) => void;
}

const STATUS_VARIANT: Record<TitularStatus, 'success' | 'muted' | 'warning'> = {
  ATIVO: 'success',
  FALECIDO: 'muted',
  TRANSFERINDO: 'warning',
};

const TIPO_VARIANT: Record<TitularTipo, 'secondary' | 'accent'> = {
  PF: 'secondary',
  PJ: 'accent',
};

function SortIcon({ field, currentSort }: { field: string; currentSort: string }) {
  if (currentSort === field) return <ChevronUp size={14} className={styles.sortIcon} />;
  if (currentSort === `-${field}`) return <ChevronDown size={14} className={styles.sortIcon} />;
  return <ChevronsUpDown size={14} className={styles.sortIconMuted} />;
}

function toggleSort(field: string, currentSort: string): string {
  if (currentSort === field) return `-${field}`;
  if (currentSort === `-${field}`) return field;
  return field;
}

export function TitularesTable({ data, sort, onSortChange, onEdit, onDelete }: TitularesTableProps) {
  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhum titular encontrado.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>
              <button
                className={styles.sortBtn}
                onClick={() => onSortChange(toggleSort('nome', sort))}
                type="button"
              >
                NOME <SortIcon field="nome" currentSort={sort} />
              </button>
            </th>
            <th className={styles.th}>TIPO</th>
            <th className={styles.th}>DOCUMENTO</th>
            <th className={styles.th}>
              <button
                className={styles.sortBtn}
                onClick={() => onSortChange(toggleSort('associacao', sort))}
                type="button"
              >
                ASSOCIAÇÃO <SortIcon field="associacao" currentSort={sort} />
              </button>
            </th>
            <th className={styles.th}>
              <button
                className={styles.sortBtn}
                onClick={() => onSortChange(toggleSort('status', sort))}
                type="button"
              >
                STATUS <SortIcon field="status" currentSort={sort} />
              </button>
            </th>
            <th className={`${styles.th} ${styles.textRight}`} aria-label="Ações">Ações</th>
          </tr>
        </thead>
        <tbody>
          {data.map((titular) => (
            <tr key={titular.id} className={styles.row}>
              <td className={styles.td}>
                <span className={styles.nome}>{titular.nome}</span>
              </td>
              <td className={styles.td}>
                <Badge variant={TIPO_VARIANT[titular.tipo]}>{titular.tipo}</Badge>
              </td>
              <td className={styles.td}>
                <span className={styles.documento}>{titular.documentoFormatado}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.chip}>{titular.associacao.sigla}</span>
              </td>
              <td className={styles.td}>
                <Badge variant={STATUS_VARIANT[titular.status]}>{titular.status}</Badge>
              </td>
              <td className={styles.td}>
                <div className={styles.actions}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => onEdit(titular.id)}
                    aria-label={`Editar ${titular.nome}`}
                    title="Editar"
                    type="button"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.danger}`}
                    onClick={() => onDelete(titular)}
                    aria-label={`Excluir ${titular.nome}`}
                    title="Excluir"
                    type="button"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
