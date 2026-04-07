import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import { useSuspenderLicenca } from '../hooks/useSuspenderLicenca';
import { useReativarLicenca } from '../hooks/useReativarLicenca';
import { useEncerrarLicenca } from '../hooks/useEncerrarLicenca';
import styles from './AlterarStatusModal.module.css';

export type AcaoStatus = 'suspender' | 'reativar' | 'encerrar';

interface AlterarStatusModalProps {
  acao: AcaoStatus;
  licencaId: string;
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

const TITULO: Record<AcaoStatus, string> = {
  suspender: 'Suspender Licença',
  reativar: 'Reativar Licença',
  encerrar: 'Encerrar Licença',
};

const VARIANT: Record<AcaoStatus, 'secondary' | 'primary' | 'danger'> = {
  suspender: 'secondary',
  reativar: 'primary',
  encerrar: 'danger',
};

const BTN_LABEL: Record<AcaoStatus, string> = {
  suspender: 'Suspender',
  reativar: 'Reativar',
  encerrar: 'Encerrar',
};

export function AlterarStatusModal({
  acao,
  licencaId,
  isOpen,
  onSuccess,
  onClose,
}: AlterarStatusModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const [confirmaEncerramento, setConfirmaEncerramento] = useState(false);
  const [justificativaError, setJustificativaError] = useState('');

  const suspenderMutation = useSuspenderLicenca();
  const reativarMutation = useReativarLicenca();
  const encerrarMutation = useEncerrarLicenca();

  const isPending =
    suspenderMutation.isPending || reativarMutation.isPending || encerrarMutation.isPending;

  const canConfirm =
    justificativa.length >= 10 &&
    (acao !== 'encerrar' || confirmaEncerramento);

  function handleClose() {
    setJustificativa('');
    setConfirmaEncerramento(false);
    setJustificativaError('');
    onClose();
  }

  async function handleConfirm() {
    if (justificativa.length < 10) {
      setJustificativaError('A justificativa deve ter pelo menos 10 caracteres');
      return;
    }
    const payload = { id: licencaId, data: { justificativa } };
    try {
      if (acao === 'suspender') await suspenderMutation.mutateAsync(payload);
      else if (acao === 'reativar') await reativarMutation.mutateAsync(payload);
      else await encerrarMutation.mutateAsync(payload);
      handleClose();
      onSuccess();
    } catch {
      // Error handled by parent via toast
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={TITULO[acao]}
      actions={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isPending} type="button">
            Cancelar
          </Button>
          <Button
            variant={VARIANT[acao]}
            onClick={handleConfirm}
            disabled={!canConfirm || isPending}
            type="button"
            id={`btn-confirmar-${acao}`}
          >
            {isPending ? 'Processando...' : BTN_LABEL[acao]}
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        {acao === 'encerrar' && (
          <div className={styles.warningBox}>
            <AlertTriangle size={18} />
            <span>Esta ação é <strong>irreversível</strong>. A licença não poderá ser reativada após encerramento.</span>
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="justificativa" className={styles.label}>
            Justificativa <span className={styles.required}>*</span>
          </label>
          <textarea
            id="justificativa"
            className={styles.textarea}
            value={justificativa}
            onChange={(e) => {
              setJustificativa(e.target.value);
              if (justificativaError) setJustificativaError('');
            }}
            placeholder="Descreva o motivo da ação (mín. 10 caracteres)..."
            rows={4}
          />
          {justificativaError && (
            <span className={styles.fieldError}>{justificativaError}</span>
          )}
          <span className={styles.charCount}>
            {justificativa.length}/10 caracteres mínimos
          </span>
        </div>

        {acao === 'encerrar' && (
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={confirmaEncerramento}
              onChange={(e) => setConfirmaEncerramento(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Entendo que esta ação é irreversível</span>
          </label>
        )}
      </div>
    </Modal>
  );
}
