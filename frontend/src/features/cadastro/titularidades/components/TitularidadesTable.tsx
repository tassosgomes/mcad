import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import type { TitularidadeItem } from '../types/titularidade';
import styles from './TitularidadesTable.module.css';

interface TitularidadesTableProps {
  items: TitularidadeItem[];
  isReadOnly: boolean;
  isRemoving?: boolean;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}

export function TitularidadesTable({
  items,
  isReadOnly,
  isRemoving,
  onEdit,
  onRemove,
}: TitularidadesTableProps) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhum titular autoral cadastrado.</p>
        {!isReadOnly && <p>Clique em "Adicionar Titular" para começar.</p>}
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Documento</th>
            <th>Categoria</th>
            <th>Percentual</th>
            {!isReadOnly && <th className={styles.actionsHeader}>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className={styles.nameCell}>
                <span className={styles.name}>{item.titular.nome}</span>
                {item.titular.associacaoSigla && (
                  <span className={styles.associacao}>{item.titular.associacaoSigla}</span>
                )}
              </td>
              <td>
                <Badge variant={item.titular.tipo === 'PJ' ? 'accent' : 'secondary'}>
                  {item.titular.tipo}
                </Badge>
              </td>
              <td>
                <span className={styles.mono}>{item.titular.documentoFormatado}</span>
              </td>
              <td>
                <span className={styles.categoria}>{item.categoria}</span>
              </td>
              <td>
                <span className={styles.percentual}>{item.percentual.toFixed(4)}%</span>
              </td>
              {!isReadOnly && (
                <td className={styles.actionsCell}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(item.id)}
                    type="button"
                    title="Editar percentual"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(item.id)}
                    type="button"
                    title="Remover titular"
                    disabled={isRemoving}
                  >
                    <Trash2 size={14} />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
