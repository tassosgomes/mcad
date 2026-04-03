import { Pencil, Trash2, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import type { ObraMusical, ObraStatus, ObraTipo } from '../types/obra';
import styles from './ObrasTable.module.css';

interface ObrasTableProps {
  data: ObraMusical[];
  canWrite: boolean;
  sort: string;
  onSortChange: (sort: string) => void;
  onEdit: (id: string) => void;
  onDelete: (obra: ObraMusical) => void;
}

const STATUS_VARIANT: Record<ObraStatus, 'success' | 'muted' | 'warning' | 'error' | 'secondary'> = {
  PENDENTE: 'warning',
  LIBERADO: 'success',
  BLOQUEADO: 'error',
  DOMINIO_PUBLICO: 'muted',
  DEPURADA: 'secondary',
};

const TIPO_VARIANT: Record<ObraTipo, 'primary' | 'secondary' | 'accent' | 'warning' | 'muted' | 'default'> = {
  MUSICAL: 'accent',
  LITEROMUSICAL: 'secondary',
  VERSAO: 'warning',
  POT_POURRI: 'muted',
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

export function ObrasTable({ data, canWrite, sort, onSortChange, onEdit, onDelete }: ObrasTableProps) {
  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhuma obra encontrada.</p>
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
                onClick={() => onSortChange(toggleSort('codigo', sort))}
                type="button"
              >
                CÓDIGO <SortIcon field="codigo" currentSort={sort} />
              </button>
            </th>
            <th className={styles.th}>
              <button
                className={styles.sortBtn}
                onClick={() => onSortChange(toggleSort('titulo', sort))}
                type="button"
              >
                TÍTULO <SortIcon field="titulo" currentSort={sort} />
              </button>
            </th>
            <th className={styles.th}>
              <button
                className={styles.sortBtn}
                onClick={() => onSortChange(toggleSort('tipo', sort))}
                type="button"
              >
                TIPO <SortIcon field="tipo" currentSort={sort} />
              </button>
            </th>
            <th className={styles.th}>GÊNERO</th>
            <th className={styles.th}>ISWC</th>
            <th className={styles.th}>
              <button
                className={styles.sortBtn}
                onClick={() => onSortChange(toggleSort('status', sort))}
                type="button"
              >
                STATUS <SortIcon field="status" currentSort={sort} />
              </button>
            </th>
            {canWrite && <th className={`${styles.th} ${styles.textRight}`} aria-label="Ações">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((obra) => (
            <tr key={obra.id} className={styles.row}>
              <td className={styles.td}>
                <span className={styles.mono}>#{obra.codigo}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.titulo}>{obra.titulo}</span>
                {obra.subtitulo && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {obra.subtitulo}
                  </div>
                )}
                {obra.status === 'DEPURADA' && obra.obraDepuradaParaId && (
                  <a href={`/obras/${obra.obraDepuradaParaId}`} onClick={(e) => { e.preventDefault(); onEdit(obra.obraDepuradaParaId!); }} className={styles.linkDepurada}>
                    → ver nova versão
                  </a>
                )}
              </td>
              <td className={styles.td}>
                <Badge variant={TIPO_VARIANT[obra.tipo] as any}>{obra.tipo}</Badge>
              </td>
              <td className={styles.td}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{obra.genero || '—'}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.iswc}>{obra.iswc || '—'}</span>
              </td>
              <td className={styles.td}>
                <Badge variant={STATUS_VARIANT[obra.status] as any}>{obra.status}</Badge>
              </td>
              {canWrite && (
                <td className={styles.td}>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => onEdit(obra.id)}
                      aria-label={`Editar ${obra.titulo}`}
                      title="Editar"
                      type="button"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={() => onDelete(obra)}
                      aria-label={`Excluir ${obra.titulo}`}
                      title="Excluir"
                      type="button"
                      disabled={obra.status === 'DEPURADA'}
                      style={{ opacity: obra.status === 'DEPURADA' ? 0.3 : 1, cursor: obra.status === 'DEPURADA' ? 'not-allowed' : 'pointer'}}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
