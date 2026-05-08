import { Badge } from '@/shared/components/ui/badge/Badge';
import { RowAuditHistoryButton } from '@features/auditoria/components/RowAuditHistoryButton';
import { auditEntityTypes } from '@features/auditoria/constants/auditEntityTypes';
import type { Upload, StatusUpload } from '../types/upload';
import styles from './UploadsTable.module.css';


interface UploadsTableProps {
  uploads: Upload[];
  onExpandErrors: (upload: Upload) => void;
  errosExpandidoId: string | null;
}

const statusBadge: Record<StatusUpload, { variant: 'accent' | 'success' | 'warning' | 'error' | 'default'; label: string }> = {
  Processando: { variant: 'accent', label: '⏳ Processando' },
  Concluido: { variant: 'success', label: '✅ Concluído' },
  ConcluidoComErros: { variant: 'warning', label: '⚠️ Com Erros' },
  Erro: { variant: 'error', label: '❌ Erro' },
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  } catch {
    return iso;
  }
}

export function UploadsTable({ uploads, onExpandErrors, errosExpandidoId }: UploadsTableProps) {
  if (!uploads?.length) {
    return (
      <div className={styles.emptyState}>
        <p>Nenhum envio de CSV encontrado.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>Data/Hora</th>
            <th>Status</th>
            <th>Total Linhas</th>
            <th>Exec. Criadas</th>
            <th>Erros</th>
            <th>Histórico</th>
          </tr>
        </thead>
        <tbody>
          {uploads.map((u) => {
            const hasErros = u.totalErros && u.totalErros > 0;
            const badgeMeta = statusBadge[u.status] || { variant: 'default', label: u.status };

            return (
              <tr 
                key={u.id}
                className={errosExpandidoId === u.id ? styles.expandedRow : ''}
              >
                <td>{u.nomeArquivo}</td>
                <td>{formatDate(u.criadoEm)}</td>
                <td>
                  <Badge variant={badgeMeta.variant as any}>
                    {u.status === 'Processando' && <span className={styles.spinner} />}
                    {badgeMeta.label}
                  </Badge>
                </td>
                <td>{u.totalLinhas ?? '-'}</td>
                <td>{u.execucoesCriadas ?? '-'}</td>
                <td>
                  {hasErros ? (
                    <button 
                      className={styles.errorLink}
                      onClick={() => onExpandErrors(u)}
                    >
                      {u.totalErros} erros
                    </button>
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  <RowAuditHistoryButton
                    entityType={auditEntityTypes.upload}
                    entityId={u.id}
                    entityLabel={u.nomeArquivo}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
