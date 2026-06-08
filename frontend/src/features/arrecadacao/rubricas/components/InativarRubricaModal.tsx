import { useState } from 'react';
import { AlertTriangle, Play, PowerOff } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Modal } from '@components/ui/modal';
import { useInativarRubrica } from '../hooks/useInativarRubrica';
import { useAtivarRubrica } from '../hooks/useAtivarRubrica';
import styles from './InativarRubricaModal.module.css';

export type AcaoStatusRubrica = 'inativar' | 'ativar';

interface InativarRubricaModalProps {
  acao: AcaoStatusRubrica;
  rubricaId: string;
  rubricaNome: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CONFIG = {
  inativar: {
    title: 'Inativar Rubrica',
    button: 'Inativar',
    variant: 'danger' as const,
    icon: PowerOff,
    message: 'Rubricas inativas não podem ser selecionadas em novos fluxos de arrecadação.',
  },
  ativar: {
    title: 'Reativar Rubrica',
    button: 'Reativar',
    variant: 'primary' as const,
    icon: Play,
    message: 'A reativação permite que a rubrica seja selecionada em novos fluxos de arrecadação.',
  },
};

export function InativarRubricaModal({
  acao,
  rubricaId,
  rubricaNome,
  isOpen,
  onClose,
  onSuccess,
}: InativarRubricaModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const [error, setError] = useState('');
  const inativarMutation = useInativarRubrica();
  const ativarMutation = useAtivarRubrica();
  const config = CONFIG[acao];
  const Icon = config.icon;
  const canConfirm = justificativa.trim().length >= 10;
  const mutation = acao === 'inativar' ? inativarMutation : ativarMutation;

  function handleClose() {
    setJustificativa('');
    setError('');
    onClose();
  }

  async function handleConfirm() {
    if (!canConfirm) {
      setError('A justificativa deve ter pelo menos 10 caracteres');
      return;
    }
    try {
      await mutation.mutateAsync({ id: rubricaId, data: { justificativa: justificativa.trim() } });
      handleClose();
      onSuccess();
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      setError(problem.detail || 'Não foi possível alterar o status');
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={config.title}
      actions={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending} type="button">
            Cancelar
          </Button>
          <Button
            variant={config.variant}
            onClick={handleConfirm}
            disabled={!canConfirm || mutation.isPending}
            type="button"
            id={`btn-confirmar-${acao}-rubrica`}
          >
            <Icon size={16} />
            {mutation.isPending ? 'Processando...' : config.button}
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <div className={styles.warningBox}>
          <AlertTriangle size={18} />
          <span>
            {config.message} <strong>{rubricaNome}</strong>
          </span>
        </div>
        <div className={styles.field}>
          <label htmlFor="rubrica-justificativa" className={styles.label}>
            Justificativa <span className={styles.required}>*</span>
          </label>
          <textarea
            id="rubrica-justificativa"
            className={styles.textarea}
            value={justificativa}
            onChange={(event) => {
              setJustificativa(event.target.value);
              if (error) setError('');
            }}
            rows={4}
            placeholder="Informe o motivo da alteração de status"
          />
          {error && <span className={styles.fieldError}>{error}</span>}
          <span className={styles.charCount}>{justificativa.trim().length}/10 caracteres mínimos</span>
        </div>
      </div>
    </Modal>
  );
}
