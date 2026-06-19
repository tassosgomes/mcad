import { useState } from 'react';
import { Modal } from '@shared/components/ui/modal/Modal';
import { isValidIsrc } from '@features/cadastro/fonogramas/utils/isrcValidator';
import { useCreateFonogramaPendente } from '../hooks/useCreateFonogramaPendente';
import { ObraFonogramaSelecionado } from '../types/execucao';
import styles from './CriarFonogramaPendenteModal.module.css';

interface CriarFonogramaPendenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: ObraFonogramaSelecionado) => void;
  obraVinculada: { id: string; titulo: string };
}

export function CriarFonogramaPendenteModal({
  isOpen,
  onClose,
  onCreated,
  obraVinculada,
}: CriarFonogramaPendenteModalProps) {
  const [isrc, setIsrc] = useState('');
  const [error, setError] = useState('');

  const { mutate, isPending } = useCreateFonogramaPendente();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedIsrc = isrc.trim().replace(/-/g, '').toUpperCase();
    if (!isValidIsrc(trimmedIsrc)) {
      setError('Informe um ISRC válido com 12 caracteres.');
      return;
    }

    mutate(
      { obraId: obraVinculada.id, isrc: trimmedIsrc },
      {
        onSuccess: (data) => {
          onCreated({
            obraId: obraVinculada.id,
            fonogramaId: data.id,
            titulo: `${obraVinculada.titulo} (Interpretação)`,
          });
          onClose(); // Parent fechará o modal
        },
        onError: () => {
          setError('Ocorreu um erro ao criar o fonograma pendente.');
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar Fonograma Pendente">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Obra Vinculada</label>
          <input
            type="text"
            className={`${styles.input} ${styles.inputReadOnly}`}
            value={obraVinculada.titulo}
            readOnly
            title="A obra já selecionada não pode ser alterada."
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>ISRC</label>
          <input
            type="text"
            className={styles.input}
            value={isrc}
            onChange={(e) => setIsrc(e.target.value)}
            disabled={isPending}
            placeholder="BR-XXX-00-00000"
            required
            autoFocus
          />
        </div>

        {error && <span className={styles.error}>{error}</span>}

        <div className={styles.buttons}>
          <button type="button" onClick={onClose} className={styles.btnCancel} disabled={isPending}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnSubmit} disabled={isPending}>
            {isPending ? 'Criando...' : 'Salvar Fonograma'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
