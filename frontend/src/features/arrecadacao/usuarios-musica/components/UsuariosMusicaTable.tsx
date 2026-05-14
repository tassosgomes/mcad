import { ArrowDown, ArrowUp, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { RowAuditHistoryButton } from '@features/auditoria/components/RowAuditHistoryButton';
import { auditEntityTypes } from '@features/auditoria/constants/auditEntityTypes';
import { usePermissions } from '@shared/authz';
import { StatusBadgeUsuarioMusica } from './StatusBadgeUsuarioMusica';
import type { UsuarioMusica } from '../types/usuario-musica';
import styles from './UsuariosMusicaTable.module.css';

interface UsuariosMusicaTableProps {
  data: UsuarioMusica[];
  sort: string;
  onSortChange: (sort: string) => void;
}

const SORTABLE_COLUMNS = [
  { key: 'razaoSocial', label: 'Razão Social' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'status', label: 'Status' },
];

function getSortIcon(sort: string, key: string) {
  if (sort === key) return <ArrowUp size={13} />;
  if (sort === `-${key}`) return <ArrowDown size={13} />;
  return null;
}

export function UsuariosMusicaTable({ data, sort, onSortChange }: UsuariosMusicaTableProps) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canWrite = can('arrecadacao:default:cliente:editar');

  function toggleSort(key: string) {
    onSortChange(sort === key ? `-${key}` : key);
  }

  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhum usuário de música encontrado.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {SORTABLE_COLUMNS.map((column) => (
              <th key={column.key} className={styles.th}>
                <button
                  className={styles.sortButton}
                  onClick={() => toggleSort(column.key)}
                  type="button"
                  aria-label={`Ordenar por ${column.label}`}
                >
                  {column.label}
                  {getSortIcon(sort, column.key)}
                </button>
              </th>
            ))}
            <th className={styles.th}>Contato</th>
            <th className={`${styles.th} ${styles.textRight}`}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {data.map((usuario) => (
            <tr key={usuario.id} className={styles.row}>
              <td className={styles.td}>
                <span className={styles.primaryText}>{usuario.razaoSocial}</span>
                <span className={styles.secondaryText}>
                  {usuario.nomeFantasia || 'Sem nome fantasia'}
                </span>
                <span className={styles.mono}>{usuario.cnpjFormatado}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.primaryText}>{usuario.endereco.cidade}</span>
                <span className={styles.secondaryText}>{usuario.endereco.uf}</span>
              </td>
              <td className={styles.td}>
                <StatusBadgeUsuarioMusica status={usuario.status} />
              </td>
              <td className={styles.td}>
                <span className={styles.primaryText}>{usuario.contato.nomeResponsavel}</span>
                <span className={styles.secondaryText}>{usuario.contato.email || usuario.contato.telefone || 'Sem canal informado'}</span>
              </td>
              <td className={styles.td}>
                <div className={styles.actions}>
                  <RowAuditHistoryButton
                    entityType={auditEntityTypes.usuarioMusica}
                    entityId={usuario.id}
                    entityLabel={usuario.razaoSocial}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/arrecadacao/usuarios-musica/${usuario.id}`)}
                    aria-label={`Ver ${usuario.razaoSocial}`}
                    title="Ver detalhes"
                    type="button"
                  >
                    <Eye size={15} />
                  </Button>
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/arrecadacao/usuarios-musica/${usuario.id}/editar`)}
                      aria-label={`Editar ${usuario.razaoSocial}`}
                      title="Editar"
                      type="button"
                    >
                      <Edit size={15} />
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
