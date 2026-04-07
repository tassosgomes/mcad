import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { FormField } from '@components/ui/form-field';
import { useToast } from '@components/ui/toast';
import { useAjustarUda } from '../hooks/useAjustarUda';
import styles from './AjustarUdaModal.module.css';

interface AjustarUdaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function AjustarUdaModal({ isOpen, onClose }: AjustarUdaModalProps) {
  const [valor, setValor] = useState('');
  const [dataVigencia, setDataVigencia] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useAjustarUda();
  const { showToast } = useToast();

  if (!isOpen) return null;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const num = parseFloat(valor);
    if (!valor || isNaN(num) || num <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }
    if (!dataVigencia) {
      newErrors.dataVigencia = 'Data de vigência é obrigatória';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).every((k) => !newErrors[k]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({ valor, dataVigencia }, {
      onSuccess: () => {
        showToast('Valor da UDA ajustado com sucesso', 'success');
        setValor('');
        setDataVigencia('');
        setErrors({});
        onClose();
      },
      onError: (err: unknown) => {
        const problem = err as { detail?: string };
        showToast(problem.detail || 'Erro ao ajustar valor da UDA', 'error');
      },
    });
  }

  function handleClose() {
    setValor('');
    setDataVigencia('');
    setErrors({});
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Ajustar Valor da UDA</h2>
          <button className={styles.closeBtn} onClick={handleClose} type="button" aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField label="Novo Valor (R$)" required error={errors.valor}>
            <input
              id="uda-valor"
              className={styles.input}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ex: 107.31"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                setErrors((prev) => ({ ...prev, valor: '' }));
              }}
            />
          </FormField>

          <FormField label="Data de Vigência" required error={errors.dataVigencia}>
            <input
              id="uda-data-vigencia"
              className={styles.input}
              type="date"
              min={getTodayStr()}
              value={dataVigencia}
              onChange={(e) => {
                setDataVigencia(e.target.value);
                setErrors((prev) => ({ ...prev, dataVigencia: '' }));
              }}
            />
          </FormField>

          <p className={styles.hint}>
            O novo valor será aplicado a partir da data de vigência informada. O histórico anterior é preservado.
          </p>

          <div className={styles.actions}>
            <Button variant="secondary" type="button" onClick={handleClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
