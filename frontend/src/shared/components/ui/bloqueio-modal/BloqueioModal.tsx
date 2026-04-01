import { useState } from 'react';
import { Button } from '../button';
import { FormField } from '../form-field';
import { Modal } from '../modal';
import { Loader2 } from 'lucide-react';

interface BloqueioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justificativa: string) => void;
  isLoading: boolean;
  entityName: string;
}

export function BloqueioModal({ isOpen, onClose, onConfirm, isLoading, entityName }: BloqueioModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const isValid = justificativa.trim().length >= 10;

  const handleConfirm = () => {
    if (isValid && !isLoading) {
      onConfirm(justificativa);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bloquear ${entityName}`}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={handleConfirm} disabled={!isValid || isLoading}>
            {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Bloquear'}
          </Button>
        </>
      }
    >
      <div style={{ minWidth: '400px' }}>
        <FormField 
          label="Justificativa" 
          required 
          error={justificativa.length > 0 && !isValid ? 'Mínimo 10 caracteres' : undefined}
        >
          <textarea 
            value={justificativa} 
            onChange={e => setJustificativa(e.target.value)}
            placeholder="Informe o motivo do bloqueio detalhadamente..." 
            rows={5}
            style={{ width: '100%', resize: 'vertical' }}
            disabled={isLoading}
          />
        </FormField>
      </div>
    </Modal>
  );
}
