import { useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Loading } from '@/shared/components/ui/loading';
import { usePreRequisitos } from '../hooks/usePreRequisitos';
import { ChecklistPreRequisitos } from './ChecklistPreRequisitos';
import styles from './FecharRolModal.module.css';

interface FecharRolModalProps {
  captacaoId: string;
  isOpen: boolean;
  isClosing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FecharRolModal({ captacaoId, isOpen, isClosing, onConfirm, onCancel }: FecharRolModalProps) {
  const { data, isLoading } = usePreRequisitos(captacaoId, isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClosing) onCancel();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isClosing, onCancel]);

  if (!isOpen) return null;

  const isReady = data?.todosAtendidos === true;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget && !isClosing) onCancel(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2>Fechar Rol de Captações</h2>
        </div>

        <div className={styles.content}>
          {isLoading && !data ? (
            <Loading />
          ) : data ? (
            <>
              <ChecklistPreRequisitos data={data} />
              {!isReady && (
                <div className={styles.errorMessage}>
                  Existem pendências que impedem o fechamento. Resolva as pendências antes de continuar.
                </div>
              )}
            </>
          ) : (
            <div className={styles.errorMessage}>
              Ocorreu um erro ao carregar os pré-requisitos. Tente novamente mais tarde.
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onCancel} disabled={isClosing}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={onConfirm} 
            disabled={!isReady || isClosing || isLoading}
          >
            {isClosing ? 'Fechando...' : 'Confirmar Fechamento'}
          </Button>
        </div>
      </div>
    </div>
  );
}
