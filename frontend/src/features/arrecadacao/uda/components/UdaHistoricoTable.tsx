import { RowAuditHistoryButton } from '@features/auditoria/components/RowAuditHistoryButton';
import { auditEntityTypes } from '@features/auditoria/constants/auditEntityTypes';
import { ActorDisplay } from '../../shared/components/actor-display';
import { useHistoricoUda } from '../hooks/useHistoricoUda';
import { useUdaVigente } from '../hooks/useUdaVigente';
import { formatBRL } from '../../shared/utils/formatCurrency';
import styles from './UdaHistoricoTable.module.css';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UdaHistoricoTable() {
  const { data: historico = [], isLoading } = useHistoricoUda();
  const { data: vigente } = useUdaVigente();

  if (isLoading) {
    return <div className={styles.loading}>Carregando histórico...</div>;
  }

  if (historico.length === 0) {
    return <div className={styles.empty}>Nenhum histórico de UDA encontrado.</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>VALOR</th>
            <th className={styles.th}>DATA VIGÊNCIA</th>
            <th className={styles.th}>CRIADO EM</th>
            <th className={styles.th}>CRIADO POR</th>
            <th className={styles.th} aria-label="Histórico">HISTÓRICO</th>
          </tr>
        </thead>
        <tbody>
          {historico.map((uda) => {
            const isVigente = vigente?.dataVigencia === uda.dataVigencia;
            return (
              <tr key={uda.id} className={`${styles.row} ${isVigente ? styles.vigenteRow : ''}`}>
                <td className={styles.td}>
                  <span className={styles.valor}>{formatBRL(uda.valor)}</span>
                  {isVigente && <span className={styles.vigenteBadge}>Vigente</span>}
                </td>
                <td className={styles.td}>
                  <span className={styles.mono}>{formatDate(uda.dataVigencia)}</span>
                </td>
                <td className={styles.td}>
                  <span className={styles.mono}>{formatDateTime(uda.criadoEm)}</span>
                </td>
                <td className={styles.td}>
                  <span className={styles.criadoPor}>
                    <ActorDisplay actor={uda.criadoPorAtor} fallbackLabel={uda.criadoPor} size="md" />
                  </span>
                </td>
                <td className={styles.td}>
                  <RowAuditHistoryButton
                    entityType={auditEntityTypes.uda}
                    entityId={uda.id}
                    entityLabel={uda.dataVigencia}
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
