import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { useDepurarObra } from '../hooks/useDepurarObra';
import type { DepurarObraRequest } from '../types/obra';
import styles from './DepuracaoModal.module.css';

interface DepuracaoModalProps {
  obraId: string | null;
  updatedData: DepurarObraRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DepuracaoModal({ obraId, updatedData, isOpen, onClose }: DepuracaoModalProps) {
  const { showToast } = useToast();
  const depurarMutation = useDepurarObra();
  const navigate = useNavigate();

  const isPending = depurarMutation.isPending;

  async function handleConfirm() {
    if (!obraId || !updatedData) return;
    try {
      const res = await depurarMutation.mutateAsync({ id: obraId, data: updatedData });
      showToast('Obra depurada com sucesso', 'success');
      onClose();
      // Navigate to the new obra
      navigate(`/cadastro/obras/${res.novaObra.id}`);
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao depurar obra', 'error');
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Depurar Obra Musical"
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending} type="button">
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={isPending} type="button">
            {isPending ? 'Depurando...' : 'Confirmar Depuração'}
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <p className={styles.message}>
          A depuração cria uma nova cópia desta obra com os mesmos dados, permitindo alterar atributos restritos como o Título, e marca esta obra original como DEPURADA.
        </p>
        <div className={styles.warning}>
          <span>Esta ação não pode ser desfeita. Tem certeza que deseja depurar esta obra?</span>
        </div>
      </div>
    </Modal>
  );
}
