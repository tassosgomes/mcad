import { useState } from 'react';
import styles from './CancelarRolModal.module.css';
import { useCancelarRol } from '../hooks/useCancelarRol';
import type { OpcaoRecriacao } from '../types/cancelamento';

interface CancelarRolModalProps {
  captacaoId: string;
  onClose: () => void;
}

export function CancelarRolModal({ captacaoId, onClose }: CancelarRolModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const [opcao, setOpcao] = useState<OpcaoRecriacao>('COPIAR_EXECUCOES');

  const { mutate: cancelar, isPending } = useCancelarRol();

  const handleConfirm = () => {
    if (justificativa.length < 10) return;
    
    cancelar(
      {
        captacaoId,
        data: { justificativa, opcaoRecriacao: opcao }
      },
      {
        onSuccess: (data) => {
          if (data.opcaoRecriacao === 'COPIAR_EXECUCOES' && data.execucoesCopiadas) {
            alert(`Captação recriada com ${data.execucoesCopiadas} execuções copiadas.`);
          }
          onClose(); // navigate happens in hook
        }
      }
    );
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-labelledby="modal-title">
        <div className={styles.header}>
          <h2 id="modal-title">Cancelar Rol</h2>
          <p>Selecione o motivo do cancelamento e decida como deseja prosseguir com a captação.</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="justificativa">Justificativa do Cancelamento</label>
          <textarea
            id="justificativa"
            className={styles.textarea}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Mínimo 10 caracteres..."
            disabled={isPending}
          />
          {justificativa.length > 0 && justificativa.length < 10 && (
            <span className={styles.errorText}>A justificativa deve ter no mínimo 10 caracteres.</span>
          )}
        </div>

        <div className={styles.opcoes}>
          <label className={`${styles.opcao} ${opcao === 'COPIAR_EXECUCOES' ? styles.opcaoSelected : ''}`}>
            <input 
              type="radio" 
              name="opcaoRecriacao" 
              value="COPIAR_EXECUCOES"
              checked={opcao === 'COPIAR_EXECUCOES'} 
              onChange={() => setOpcao('COPIAR_EXECUCOES')}
              disabled={isPending}
            />
            <div>
              <strong>Recriar com execuções copiadas</strong>
              <p>Nova captação com todas as execuções copiadas. O status de cada execução será recalibrado conforme a obra.</p>
            </div>
          </label>
          
          <label className={`${styles.opcao} ${opcao === 'RECRIAR_VAZIA' ? styles.opcaoSelected : ''}`}>
            <input 
              type="radio" 
              name="opcaoRecriacao" 
              value="RECRIAR_VAZIA"
              checked={opcao === 'RECRIAR_VAZIA'} 
              onChange={() => setOpcao('RECRIAR_VAZIA')}
              disabled={isPending}
            />
            <div>
              <strong>Recriar vazia</strong>
              <p>Nova captação em branco, para a mesma rubrica e mesmo período, sem execuções musicais atreladas.</p>
            </div>
          </label>
          
          <label className={`${styles.opcao} ${opcao === 'APENAS_CANCELAR' ? styles.opcaoSelected : ''}`}>
            <input 
              type="radio" 
              name="opcaoRecriacao" 
              value="APENAS_CANCELAR"
              checked={opcao === 'APENAS_CANCELAR'} 
              onChange={() => setOpcao('APENAS_CANCELAR')}
              disabled={isPending}
            />
            <div>
              <strong>Apenas cancelar</strong>
              <p>A captação atual será cancelada e nenhuma nova captação será criada. Ação irreversível.</p>
            </div>
          </label>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isPending}>
            Voltar
          </button>
          <button 
            className={styles.btnConfirm} 
            onClick={handleConfirm}
            disabled={isPending || justificativa.length < 10}
          >
            {isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
