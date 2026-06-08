import { Edit, PowerOff, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { usePermissions } from '@shared/authz';
import type { Rubrica } from '../types/rubrica';
import styles from './RubricasTable.module.css';

interface RubricasTableProps {
  data: Rubrica[];
  onInativar: (rubrica: Rubrica) => void;
  onAtivar: (rubrica: Rubrica) => void;
}

export function RubricasTable({ data, onInativar, onAtivar }: RubricasTableProps) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canEdit = can('arrecadacao:default:rubrica:editar');
  const canInativar = can('arrecadacao:default:rubrica:inativar');

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
            <th className={styles.th}>Sigla</th>
            <th className={styles.th}>Nome</th>
            <th className={styles.th}>Exige Classificação</th>
            <th className={styles.th}>Status</th>
            <th className={`${styles.th} ${styles.textRight}`}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rubrica) => (
            <tr
              key={rubrica.id}
              className={`${styles.row} ${!rubrica.ativo ? styles.inactive : ''}`}
            >
              <td className={styles.td}>
                <span className={styles.mono}>{rubrica.sigla}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.primaryText}>{rubrica.nome}</span>
              </td>
              <td className={styles.td}>
                <Badge variant={rubrica.exigeClassificacao ? 'success' : 'muted'}>
                  {rubrica.exigeClassificacao ? 'Sim' : 'Não'}
                </Badge>
              </td>
              <td className={styles.td}>
                <Badge variant={rubrica.ativo ? 'success' : 'error'}>
                  {rubrica.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
              </td>
              <td className={styles.td}>
                <div className={styles.actions}>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/arrecadacao/rubricas/${rubrica.id}/editar`)}
                      aria-label={`Editar ${rubrica.nome}`}
                      title="Editar"
                      type="button"
                    >
                      <Edit size={15} />
                    </Button>
                  )}
                  {canInativar && rubrica.ativo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onInativar(rubrica)}
                      aria-label={`Inativar ${rubrica.nome}`}
                      title="Inativar"
                      type="button"
                    >
                      <PowerOff size={15} />
                    </Button>
                  )}
                  {canInativar && !rubrica.ativo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAtivar(rubrica)}
                      aria-label={`Ativar ${rubrica.nome}`}
                      title="Ativar"
                      type="button"
                    >
                      <Play size={15} />
                    </Button>
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
