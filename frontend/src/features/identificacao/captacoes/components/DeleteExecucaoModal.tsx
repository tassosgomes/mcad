import { Modal } from '@shared/components/ui/modal/Modal';
import { useDeleteExecucao } from '../hooks/useDeleteExecucao';
import type { Execucao } from '../types/execucao';
import styles from './DeleteExecucaoModal.module.css';

interface DeleteExecucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  captacaoId: string;
  execucao: Execucao;
}

export function DeleteExecucaoModal({
  isOpen,
  onClose,
  captacaoId,
  execucao,
}: DeleteExecucaoModalProps) {
  const { mutate, isPending } = useDeleteExecucao(captacaoId);

  const handleDelete = () => {
    mutate(execucao.id, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  if (!execucao) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir Execução">
      <p className={styles.message}>
        Tem certeza que deseja excluir a execução vinculada a{' '}
        <span className={styles.itemTitle}>{execucao.obraTitulo}</span>?
      </p>

      <div className={styles.warningBox}>
        <p className={styles.warningText}>
          Esta ação removerá o registro desta captação e poderá afetar o resumo estatístico. 
          Você não poderá desfazer essa operação.
        </p>
      </div>

      <div className={styles.buttons}>
        <button
          type="button"
          onClick={onClose}
          className={styles.btnCancel}
          disabled={isPending}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className={styles.btnDelete}
          disabled={isPending}
        >
          {isPending ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </Modal>
  );
}
