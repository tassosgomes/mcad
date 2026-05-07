import { useState } from 'react';
import { AlertTriangle, Play, PowerOff } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Modal } from '@components/ui/modal';
import { useAlterarStatusUsuarioMusica, type AcaoStatusUsuarioMusica } from '../hooks/useAlterarStatusUsuarioMusica';
import styles from './AlterarStatusUsuarioMusicaModal.module.css';

interface AlterarStatusUsuarioMusicaModalProps {
  acao: AcaoStatusUsuarioMusica;
  usuarioId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CONFIG = {
  inativar: {
    title: 'Inativar usuário de música',
    button: 'Inativar',
    variant: 'danger' as const,
    icon: PowerOff,
    message: 'Usuários inativos não devem ser selecionados em novas licenças.',
  },
  ativar: {
    title: 'Reativar usuário de música',
    button: 'Reativar',
    variant: 'primary' as const,
    icon: Play,
    message: 'A reativação permite que o usuário seja selecionado em novos fluxos de arrecadação.',
  },
};

export function AlterarStatusUsuarioMusicaModal({
  acao,
  usuarioId,
  isOpen,
  onClose,
  onSuccess,
}: AlterarStatusUsuarioMusicaModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const [error, setError] = useState('');
  const mutation = useAlterarStatusUsuarioMusica(acao);
  const config = CONFIG[acao];
  const Icon = config.icon;
  const canConfirm = justificativa.trim().length >= 10;

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
      await mutation.mutateAsync({ id: usuarioId, data: { justificativa: justificativa.trim() } });
      handleClose();
      onSuccess();
    } catch (error: unknown) {
      const problem = error as { detail?: string };
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
            id={`btn-confirmar-${acao}-usuario-musica`}
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
          <span>{config.message}</span>
        </div>
        <div className={styles.field}>
          <label htmlFor="usuario-musica-justificativa" className={styles.label}>
            Justificativa <span className={styles.required}>*</span>
          </label>
          <textarea
            id="usuario-musica-justificativa"
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
