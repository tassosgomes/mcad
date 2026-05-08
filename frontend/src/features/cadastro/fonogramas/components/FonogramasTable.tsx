import { Pencil, Trash2, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { RowAuditHistoryButton } from '@features/auditoria/components/RowAuditHistoryButton';
import { auditEntityTypes } from '@features/auditoria/constants/auditEntityTypes';
import type { FonogramaResumo } from '../types/fonograma';
import { formatIsrc } from '../utils/isrcFormatter';
import styles from './FonogramasTable.module.css';

interface FonogramasTableProps {
  data: FonogramaResumo[];
  canWrite: boolean;
  sort: string;
  onSortChange: (sort: string) => void;
  onEdit: (id: string) => void;
  onDelete: (fonograma: FonogramaResumo) => void;
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary' | 'error'> = {
  Pendente_Validacao: 'warning',
  Pendente_Documentacao: 'warning',
  Liberado: 'success',
  Depurado: 'secondary',
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

export function FonogramasTable({ data, canWrite, sort, onSortChange, onEdit, onDelete }: FonogramasTableProps) {
  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhum fonograma encontrado.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>
              <button className={styles.sortBtn} onClick={() => onSortChange(toggleSort('codigo', sort))} type="button">
                CÓDIGO <SortIcon field="codigo" currentSort={sort} />
              </button>
            </th>
            <th className={styles.th}>
              <button className={styles.sortBtn} onClick={() => onSortChange(toggleSort('isrc', sort))} type="button">
                ISRC <SortIcon field="isrc" currentSort={sort} />
              </button>
            </th>
            <th className={styles.th}>OBRA MUSICAL</th>
            <th className={styles.th}>
              <button className={styles.sortBtn} onClick={() => onSortChange(toggleSort('pais', sort))} type="button">
                PAÍS ORIGEM <SortIcon field="pais" currentSort={sort} />
              </button>
            </th>
            <th className={styles.th}>
              <button className={styles.sortBtn} onClick={() => onSortChange(toggleSort('status', sort))} type="button">
                STATUS <SortIcon field="status" currentSort={sort} />
              </button>
            </th>
            <th className={styles.th}>LANÇAMENTO</th>
            <th className={`${styles.th} ${styles.textRight}`}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {data.map((fonograma) => (
            <tr key={fonograma.id} className={styles.row}>
              <td className={styles.td}>
                <span className={styles.mono}>#{fonograma.codigo}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.isrc}>{formatIsrc(fonograma.isrcFormatado)}</span>
                {fonograma.status === 'Depurado' && (
                  <div className={styles.depuracaoLink}>→ ver ativo</div>
                )}
              </td>
              <td className={styles.td}>
                <span className={styles.titulo}>{fonograma.obra?.titulo || '—'}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.pais}>{fonograma.paisOrigem}</span>
              </td>
              <td className={styles.td}>
                <Badge variant={STATUS_VARIANT[fonograma.status] as any}>{fonograma.status.replace('_', ' ')}</Badge>
              </td>
              <td className={styles.td}>
                <span className={styles.data}>{fonograma.dataLancamento || '—'}</span>
              </td>
              <td className={styles.td}>
                <div className={styles.actions}>
                  <RowAuditHistoryButton
                    entityType={auditEntityTypes.fonograma}
                    entityId={fonograma.id}
                    entityLabel={fonograma.isrcFormatado}
                  />
                  {canWrite && (
                    <>
                    <button
                      className={styles.actionBtn}
                      onClick={() => onEdit(fonograma.id)}
                      aria-label={`Editar ${fonograma.isrcFormatado}`}
                      title="Editar"
                      type="button"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={() => onDelete(fonograma)}
                      aria-label={`Excluir ${fonograma.isrcFormatado}`}
                      title="Excluir"
                      type="button"
                      disabled={fonograma.status === 'Liberado' || fonograma.status === 'Depurado'}
                      style={{ opacity: fonograma.status === 'Liberado' || fonograma.status === 'Depurado' ? 0.3 : 1, cursor: fonograma.status === 'Liberado' || fonograma.status === 'Depurado' ? 'not-allowed' : 'pointer'}}
                    >
                      <Trash2 size={15} />
                    </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
