import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { RowAuditHistoryButton } from '@features/auditoria/components/RowAuditHistoryButton';
import { auditEntityTypes } from '@features/auditoria/constants/auditEntityTypes';
import { StatusBadgeLicenca } from './StatusBadgeLicenca';
import type { Licenca } from '../types/licenca';
import styles from './LicencasTable.module.css';

interface LicencasTableProps {
  data: Licenca[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Indefinida';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function LicencasTable({ data }: LicencasTableProps) {
  const navigate = useNavigate();

  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhuma licença encontrada.</p>
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
            <th className={styles.th}>DATA INÍCIO</th>
            <th className={styles.th}>DATA FIM</th>
            <th className={styles.th}>STATUS</th>
            <th className={`${styles.th} ${styles.textRight}`} aria-label="Ações">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          {data.map((licenca) => (
            <tr key={licenca.id} className={styles.row}>
              <td className={styles.td}>
                <span className={styles.primaryText}>{licenca.usuarioMusica.razaoSocial}</span>
                <span className={styles.secondaryText}>{licenca.usuarioMusica.cnpjFormatado}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.chip}>{licenca.rubrica.sigla}</span>
                <span className={styles.rubricaNome}>{licenca.rubrica.nome}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.mono}>{formatDate(licenca.dataInicio)}</span>
              </td>
              <td className={styles.td}>
                <span className={licenca.dataFim ? styles.mono : styles.indefinida}>
                  {formatDate(licenca.dataFim)}
                </span>
              </td>
              <td className={styles.td}>
                <StatusBadgeLicenca status={licenca.status} />
              </td>
              <td className={styles.td}>
                <div className={styles.actions}>
                  <RowAuditHistoryButton
                    entityType={auditEntityTypes.licenca}
                    entityId={licenca.id}
                    entityLabel={licenca.usuarioMusica.razaoSocial}
                  />
                  <button
                    className={styles.actionBtn}
                    onClick={() => navigate(`/arrecadacao/licencas/${licenca.id}`)}
                    aria-label={`Ver detalhes da licença de ${licenca.usuarioMusica.razaoSocial}`}
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
