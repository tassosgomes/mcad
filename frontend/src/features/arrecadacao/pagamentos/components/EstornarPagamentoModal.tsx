import { useState } from 'react';
import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import { useEstornarPagamento } from '../hooks/useEstornarPagamento';
import { formatBRL } from '../../shared/utils/formatCurrency';
import type { Pagamento } from '../types/pagamento';
import styles from './EstornarPagamentoModal.module.css';

interface EstornarPagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pagamento: Pagamento;
}

export function EstornarPagamentoModal({ isOpen, onClose, pagamento }: EstornarPagamentoModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const mutation = useEstornarPagamento();
  const { addToast } = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ id: pagamento.id, data: { justificativa } }, {
      onSuccess: () => {
        addToast({ type: 'success', title: 'Sucesso', message: 'Pagamento estornado com sucesso!' });
        onClose();
      },
      onError: (err: unknown) => {
        const problem = err as { detail?: string; status?: number };
        let message = problem.detail || 'Erro ao estornar pagamento';
        
        if (problem.status === 422) {
          if (message.includes('VerbaEmDistribuicaoException') || message.includes('Distribuição em andamento')) {
            message = 'Não é possível estornar pois a verba já está em distribuição ou distribuída.';
          } else if (message.includes('ESTORNADO')) {
            message = 'Este pagamento já foi estornado anteriormente.';
          }
        }
        
        addToast({ type: 'error', title: 'Erro', message: message });
      },
    });
  }

  const isLengthValid = justificativa.length >= 10 && justificativa.length <= 500;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Estornar Pagamento">
      <div className={styles.resumo}>
        <span className={styles.resumoTexto}>
          Licença: <strong>{pagamento.licenca.usuarioMusica.razaoSocial} — {pagamento.licenca.rubrica.sigla}</strong>
        </span>
        <span className={styles.resumoTexto}>
          Período: <strong>{pagamento.periodo}</strong>
        </span>
        <span className={styles.resumoTexto}>
          Valor Bruto: <strong>{formatBRL(pagamento.valorBruto)}</strong>
        </span>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.textareaContainer}>
          <textarea
            className={styles.textarea}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Informe o motivo do estorno... (mín. 10 caracteres)"
            maxLength={500}
            disabled={mutation.isPending}
            autoFocus
          />
          <span className={`${styles.charCount} ${!isLengthValid && justificativa.length > 0 ? styles.charCountInvalid : ''}`}>
            {justificativa.length}/500 {justificativa.length > 0 && justificativa.length < 10 && '(mín. 10)'}
          </span>
        </div>
        
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" disabled={!isLengthValid || mutation.isPending}>
            {mutation.isPending ? 'Estornando...' : 'Confirmar Estorno'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
