import { useState } from 'react';
import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import styles from './CancelarModal.module.css';

interface CancelarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justificativa: string) => Promise<void>;
  isLoading: boolean;
}

export function CancelarModal({ isOpen, onClose, onConfirm, isLoading }: CancelarModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const { addToast } = useToast();

  const isLengthValid = justificativa.length >= 10 && justificativa.length <= 500;

  async function handleConfirm() {
    if (!isLengthValid) return;
    try {
      await onConfirm(justificativa);
      setJustificativa('');
    } catch (err: unknown) {
      const problem = err as { detail?: string; status?: number };
      let message = problem.detail || 'Erro ao cancelar processo';

      if (problem.status === 422) {
        message = 'Processo finalizado não pode ser cancelado.';
      }

      addToast({ type: 'error', title: 'Erro', message });
    }
  }

  function handleClose() {
    setJustificativa('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancelar Processo"
      actions={
        <>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={!isLengthValid || isLoading}
            id="btn-confirmar-cancelar-processo"
          >
            {isLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <div className={styles.textareaContainer}>
          <textarea
            className={styles.textarea}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Informe o motivo do cancelamento... (mín. 10 caracteres)"
            maxLength={500}
            disabled={isLoading}
            autoFocus
            rows={4}
          />
          <span
            className={`${styles.charCount} ${!isLengthValid && justificativa.length > 0 ? styles.charCountInvalid : ''}`}
          >
            {justificativa.length}/500 {justificativa.length > 0 && justificativa.length < 10 && '(mín. 10)'}
          </span>
        </div>
      </div>
    </Modal>
  );
}
