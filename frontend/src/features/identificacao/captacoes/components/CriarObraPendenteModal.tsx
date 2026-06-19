import { useState } from 'react';
import { Modal } from '@shared/components/ui/modal/Modal';
import { useCreateObraPendente } from '../hooks/useCreateObraPendente';
import { ObraFonogramaSelecionado, TipoObraCadastro } from '../types/execucao';
import styles from './CriarObraPendenteModal.module.css';

const TIPOS_OBRA: Array<{ value: TipoObraCadastro; label: string }> = [
  { value: 'MUSICAL', label: 'Musical' },
  { value: 'LITEROMUSICAL', label: 'Literomusical' },
  { value: 'VERSAO', label: 'Versão' },
  { value: 'POT_POURRI', label: 'Pot-pourri' },
];

interface CriarObraPendenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: ObraFonogramaSelecionado) => void;
  initialTitulo?: string;
}

export function CriarObraPendenteModal({
  isOpen,
  onClose,
  onCreated,
  initialTitulo = '',
}: CriarObraPendenteModalProps) {
  const [titulo, setTitulo] = useState(initialTitulo);
  const [tipoObra, setTipoObra] = useState<TipoObraCadastro>('MUSICAL');
  const [error, setError] = useState('');

  const { mutate, isPending } = useCreateObraPendente();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setError('O título é obrigatório.');
      return;
    }
    setError('');

    mutate(
      { titulo, tipoObra },
      {
        onSuccess: (data) => {
          onCreated({
            obraId: data.id,
            fonogramaId: null,
            titulo: data.titulo,
          });
          onClose(); // Parent fechará o modal
        },
        onError: () => {
          setError('Ocorreu um erro ao criar a obra pendente.');
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar Obra Pendente">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Título da Obra *</label>
          <input
            type="text"
            className={styles.input}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            disabled={isPending}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Tipo de Obra *</label>
          <select
            className={styles.select}
            value={tipoObra}
            onChange={(e) => setTipoObra(e.target.value as TipoObraCadastro)}
            disabled={isPending}
          >
            {TIPOS_OBRA.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
        </div>

        {error && <span className={styles.error}>{error}</span>}

        <div className={styles.buttons}>
          <button type="button" onClick={onClose} className={styles.btnCancel} disabled={isPending}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnSubmit} disabled={isPending}>
            {isPending ? 'Criando...' : 'Salvar Obra'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
