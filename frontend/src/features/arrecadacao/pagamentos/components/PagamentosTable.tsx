import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { RowAuditHistoryButton } from '@features/auditoria/components/RowAuditHistoryButton';
import { auditEntityTypes } from '@features/auditoria/constants/auditEntityTypes';
import { StatusBadgePagamento } from './StatusBadgePagamento';
import { formatBRL, formatUdas } from '../../shared/utils/formatCurrency';
import type { Pagamento } from '../types/pagamento';
import styles from './PagamentosTable.module.css';

interface PagamentosTableProps {
  data: Pagamento[];
}

export function PagamentosTable({ data }: PagamentosTableProps) {
  const navigate = useNavigate();

  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhum pagamento encontrado.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>USUÁRIO</th>
            <th className={styles.th}>RUBRICA</th>
            <th className={styles.th}>PERÍODO</th>
            <th className={styles.th}>QTD UDAs</th>
            <th className={styles.th}>VALOR R$</th>
            <th className={styles.th}>STATUS</th>
            <th className={`${styles.th} ${styles.textRight}`} aria-label="Ações">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          {data.map((pagamento) => (
            <tr key={pagamento.id} className={styles.row}>
              <td className={styles.td}>
                <span className={styles.primaryText}>{pagamento.licenca.usuarioMusica.razaoSocial}</span>
                <span className={styles.secondaryText}>{pagamento.licenca.usuarioMusica.cnpj}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.chip}>{pagamento.licenca.rubrica.sigla}</span>
                <span className={styles.rubricaNome}>{pagamento.licenca.rubrica.nome}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.mono}>{pagamento.periodo}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.mono}>{formatUdas(pagamento.quantidadeUdas)}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.valor}>{formatBRL(pagamento.valorBruto)}</span>
              </td>
              <td className={styles.td}>
                <StatusBadgePagamento status={pagamento.status} />
              </td>
              <td className={styles.td}>
                <div className={styles.actions}>
                  <RowAuditHistoryButton
                    entityType={auditEntityTypes.pagamento}
                    entityId={pagamento.id}
                    entityLabel={pagamento.periodo}
                  />
                  <button
                    className={styles.actionBtn}
                    onClick={() => navigate(`/arrecadacao/pagamentos/${pagamento.id}`)}
                    aria-label={`Ver detalhes do pagamento de ${pagamento.licenca.usuarioMusica.razaoSocial}`}
                    title="Ver detalhes"
                    type="button"
                  >
                    <Eye size={15} />
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
