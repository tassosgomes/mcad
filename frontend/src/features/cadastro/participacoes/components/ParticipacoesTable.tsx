import { useState, useRef, useEffect } from 'react';
import { Lock, Trash2 } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import type { ParticipacaoItem } from '../types/participacao';
import { CATEGORIA_LABELS } from '../types/participacao';
import styles from './ParticipacoesTable.module.css';

interface ParticipacoesTableProps {
  items: ParticipacaoItem[];
  isReadOnly: boolean;
  isRemoving?: boolean;
  onAjustarPercentual: (participacaoId: string, percentual: number) => void;
  onRemove: (participacaoId: string) => void;
}

function InlinePercentualCell({
  item,
  onSave,
}: {
  item: ParticipacaoItem;
  onSave: (percentual: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.percentual?.toFixed(4) ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSave() {
    const num = parseFloat(draft);
    if (!isNaN(num) && num > 0 && num <= 100) {
      onSave(num);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') { setDraft(item.percentual?.toFixed(4) ?? ''); setEditing(false); }
  }

  // Músico — não editável, exibe cadeado
  if (!item.editavel) {
    return (
      <span className={styles.lockedValue}>
        <span className={styles.monoValue}>{item.percentual != null ? `${item.percentual.toFixed(4)}%` : '—'}</span>
        <Lock size={12} className={styles.lockIcon} />
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        className={styles.inlineInput}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        min="0.0001"
        max="100"
        step="0.0001"
      />
    );
  }

  return (
    <span
      className={styles.editableValue}
      onClick={() => setEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditing(true); }}
      title="Clique para editar"
    >
      {item.percentual != null ? `${item.percentual.toFixed(4)}%` : '—'}
    </span>
  );
}

export function ParticipacoesTable({
  items,
  isReadOnly,
  isRemoving,
  onAjustarPercentual,
  onRemove,
}: ParticipacoesTableProps) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhum participante conexo cadastrado.</p>
        {!isReadOnly && <p>Clique em "Adicionar Participante" para começar.</p>}
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Código</th>
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
              <td>
                <span className={styles.mono}>#{item.titular.codigo}</span>
              </td>
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
                <span className={styles.categoria}>{CATEGORIA_LABELS[item.categoria]}</span>
              </td>
              <td>
                {isReadOnly ? (
                  <span className={styles.monoValue}>
                    {item.percentual != null ? `${item.percentual.toFixed(4)}%` : '—'}
                    {!item.editavel && <Lock size={12} className={styles.lockIcon} />}
                  </span>
                ) : (
                  <InlinePercentualCell
                    item={item}
                    onSave={(percentual) => onAjustarPercentual(item.id, percentual)}
                  />
                )}
              </td>
              {!isReadOnly && (
                <td className={styles.actionsCell}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(item.id)}
                    type="button"
                    title="Remover participante"
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
