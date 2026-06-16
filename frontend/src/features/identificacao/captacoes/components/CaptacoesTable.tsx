import { Eye, Trash2 } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { RowAuditHistoryButton } from '@features/auditoria/components/RowAuditHistoryButton';
import { auditEntityTypes } from '@features/auditoria/constants/auditEntityTypes';

import type { Captacao } from '../types/captacao';
import styles from './CaptacoesTable.module.css';

interface CaptacoesTableProps {
  data: Captacao[];
  canWrite: boolean;
  currentUserId: string;
  sort: string;
  onSortChange: (sort: string) => void;
  onView: (id: string) => void;
  onDelete: (captacao: Captacao) => void;
}

export function CaptacoesTable({
  data,
  canWrite,
  currentUserId,
  sort,
  onSortChange,
  onView,
  onDelete,
}: CaptacoesTableProps) {
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ABERTA': return 'accent';
      case 'FECHADA': return 'success';
      case 'CANCELADA': return 'muted';
      default: return 'muted';
    }
  };

  const getRubricaVariant = (sigla: string) => {
    switch (sigla) {
      case 'TV_ABERTA':
      case 'TV_FECHADA':
      case 'CINEMA':
      case 'VOD':
        return 'accent';
      case 'RADIO':
      case 'STREAMING_AUDIO':
        return 'secondary';
      case 'SHOW':
        return 'warning';
      default:
        return 'primary'; // fallback
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString + 'T12:00:00Z');
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Nenhuma captação encontrada.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th onClick={() => toggleSort('rubrica')} className={styles.thSortable}>
              Rubrica{getSortIcon('rubrica')}
            </th>
            <th onClick={() => toggleSort('periodo')} className={styles.thSortable}>
              Período{getSortIcon('periodo')}
            </th>
            <th className={styles.th}>Usuário de Música</th>
            <th className={styles.th}>Status</th>
            <th className={styles.th}>Responsável</th>
            <th className={`${styles.th} ${styles.actionsCell}`}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {data.map((captacao) => {
            const canDelete =
              canWrite &&
              captacao.analistaResponsavel.id === currentUserId &&
              captacao.status === 'ABERTA';

            return (
              <tr key={captacao.id} className={styles.row}>
                <td className={styles.td}>
                  <Badge variant={getRubricaVariant(captacao.rubrica.sigla) as any}>
                    {captacao.rubrica.nome}
                  </Badge>
                </td>
                <td className={styles.td}>{formatDate(captacao.periodo)}</td>
                <td className={styles.td}>
                  <div className={styles.truncate} title={captacao.usuarioMusicaNome}>
                    {captacao.usuarioMusicaNome}
                  </div>
                </td>
                <td className={styles.td}>
                  <Badge variant={getStatusVariant(captacao.status) as any}>
                    {captacao.status}
                  </Badge>
                </td>
                <td className={styles.td}>{captacao.analistaResponsavel.nome}</td>
                <td className={`${styles.td} ${styles.actionsCell}`}>
                  <RowAuditHistoryButton
                    entityType={auditEntityTypes.captacao}
                    entityId={captacao.id}
                    entityLabel={captacao.usuarioMusicaNome}
                  />
                  <button
                    className={styles.actionButton}
                    onClick={() => onView(captacao.id)}
                    title="Ver detalhes"
                  >
                    <Eye size={18} />
                  </button>
                  {canDelete && (
                    <button
                      className={`${styles.actionButton} ${styles.dangerButton}`}
                      onClick={() => onDelete(captacao)}
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
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
