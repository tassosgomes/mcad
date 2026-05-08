import { Edit2, Trash2 } from 'lucide-react';
import { Badge } from '@shared/components/ui/badge';
import { RowAuditHistoryButton } from '@features/auditoria/components/RowAuditHistoryButton';
import { auditEntityTypes } from '@features/auditoria/constants/auditEntityTypes';
import type { Execucao } from '../types/execucao';
import type { Captacao } from '../types/captacao';
import styles from './ExecucoesTable.module.css';

interface ExecucoesTableProps {
  data: Execucao[];
  captacao: Captacao;
  canWrite: boolean;
  currentUserId: string;
  sort: string;
  onSortChange: (sort: string) => void;
  onEdit: (execucao: Execucao) => void;
  onDelete: (execucao: Execucao) => void;
}

function formatDuracao(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  if (min === 0) return `${sec}s`;
  if (sec === 0) return `${min}min`;
  return `${min}min ${sec}s`;
}

export function ExecucoesTable({
  data,
  captacao,
  canWrite,
  currentUserId,
  sort,
  onSortChange,
  onEdit,
  onDelete,
}: ExecucoesTableProps) {
  const toggleSort = (field: string) => {
    if (sort === field) {
      onSortChange(`-${field}`);
    } else {
      onSortChange(field);
    }
  };

  const getSortIcon = (field: string) => {
    if (sort === field) return ' ↑';
    if (sort === `-${field}`) return ' ↓';
    return '';
  };

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Nenhuma execução registrada nesta captação.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th onClick={() => toggleSort('obratitulo')} className={styles.thSortable}>
              Obra / Fonograma{getSortIcon('obratitulo')}
            </th>
            <th className={styles.th}>Intérpretes</th>
            <th onClick={() => toggleSort('inicio')} className={styles.thSortable}>
              Horário{getSortIcon('inicio')}
            </th>
            <th className={styles.th}>Qtd</th>
            {captacao.rubrica.exigeClassificacao && <th className={styles.th}>Tipo (Prog)</th>}
            <th onClick={() => toggleSort('status')} className={styles.thSortable}>
              Status{getSortIcon('status')}
            </th>
            <th className={`${styles.th} ${styles.actionsCell}`}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {data.map((execucao) => {
            const canModify =
              canWrite &&
              captacao.status?.toUpperCase() === 'ABERTA' &&
              captacao.analistaResponsavel.id === currentUserId;

            return (
              <tr key={execucao.id} className={styles.row}>
                <td className={styles.td}>
                  <div className={styles.titleWrapper}>
                    <span className={styles.obraTitle}>{execucao.obraTitulo}</span>
                    <span className={styles.idCode}>
                      {execucao.fonogramaIsrc ? `ISRC: ${execucao.fonogramaIsrc}` : execucao.obraIswc ? `ISWC: ${execucao.obraIswc}` : 'Sem código'}
                    </span>
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.truncate} title={execucao.interpretes || '-'}>
                    {execucao.interpretes || '-'}
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.titleWrapper}>
                    <span>{execucao.inicio} até {execucao.fim}</span>
                    <span className={styles.idCode}>{formatDuracao(execucao.duracaoSegundos)}</span>
                  </div>
                </td>
                <td className={styles.td}>{execucao.quantidade}</td>
                
                {captacao.rubrica.exigeClassificacao && (
                  <td className={styles.td}>
                    {execucao.tipoUtilizacao ? (
                      <div className={styles.titleWrapper}>
                        <Badge variant="accent">{execucao.tipoUtilizacao.sigla}</Badge>
                        <span className={styles.idCode} title={execucao.tituloPrograma || ''}>
                          {execucao.tituloPrograma || ''}
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                )}

                <td className={styles.td}>
                  <Badge variant={execucao.status === 'Identificada' ? 'success' : 'warning'}>
                    {execucao.status}
                  </Badge>
                </td>
                <td className={`${styles.td} ${styles.actionsCell}`}>
                  <RowAuditHistoryButton
                    entityType={auditEntityTypes.execucao}
                    entityId={execucao.id}
                    entityLabel={execucao.obraTitulo}
                  />
                  {canModify && (
                    <>
                      <button
                        className={styles.actionButton}
                        onClick={() => onEdit(execucao)}
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.dangerButton}`}
                        onClick={() => onDelete(execucao)}
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
