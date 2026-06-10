import { Badge } from '@components/ui/badge';
import { RowAuditHistoryButton } from '@features/auditoria/components/RowAuditHistoryButton';
import { auditEntityTypes } from '@features/auditoria/constants/auditEntityTypes';
import type { Rubrica } from '../types/rubrica';
import styles from './RubricasTable.module.css';

export function RubricasTable({ data }: { data: Rubrica[] }) {
  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhuma rubrica encontrada.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>SIGLA</th>
            <th className={styles.th}>NOME</th>
            <th className={styles.th}>CLASSIFICAÇÃO</th>
            <th className={`${styles.th} ${styles.textRight}`}>HISTÓRICO</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rubrica) => (
            <tr key={rubrica.id} className={styles.row}>
              <td className={styles.td}>
                <span className={styles.sigla}>{rubrica.sigla}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.nome}>{rubrica.nome}</span>
              </td>
              <td className={styles.td}>
                <Badge variant={rubrica.exigeClassificacao ? 'accent' : 'muted'}>
                  {rubrica.exigeClassificacao ? 'Sim' : 'Não'}
                </Badge>
              </td>
              <td className={styles.td}>
                <div className={styles.actions}>
                  <RowAuditHistoryButton
                    entityType={auditEntityTypes.rubrica}
                    entityId={rubrica.id}
                    entityLabel={rubrica.sigla}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
