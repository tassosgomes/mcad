import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormField } from '@components/ui/form-field';
import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import { Button } from '@components/ui/button';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { useCriarSolicitacao } from '../../solicitacoes/hooks/useSolicitacoes';
import type { SolicitacaoCampo } from '../../solicitacoes/types/solicitacao';
import styles from './AbrirSolicitacaoPage.module.css';

const CAMPO_OPTIONS = [
  { value: 'NOME' as const, label: 'Nome' },
  { value: 'CAE_IPI' as const, label: 'CAE / IPI' },
  { value: 'ASSOCIACAO' as const, label: 'Associação' },
  { value: 'CATEGORIA' as const, label: 'Categoria' },
];

export function AbrirSolicitacaoPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const criarMutation = useCriarSolicitacao();

  const [campo, setCampo] = useState<SolicitacaoCampo>('NOME');
  const [valorPretendido, setValorPretendido] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (campo === 'ASSOCIACAO' && !valorPretendido.trim()) {
      newErrors.valorPretendido = 'A associação de destino é obrigatória. O vínculo só pode ser alterado, nunca removido.';
    } else if (!valorPretendido.trim()) {
      newErrors.valorPretendido = 'Valor pretendido é obrigatório';
    }

    if (!justificativa.trim()) newErrors.justificativa = 'Justificativa é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).every((k) => !newErrors[k]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      await criarMutation.mutateAsync({
        campo,
        valorPretendido: valorPretendido.trim(),
        justificativa: justificativa.trim(),
      });
      showToast('Solicitação enviada com sucesso!', 'success');
      navigate('/portal/solicitacoes', { replace: true });
    } catch (err: unknown) {
      const problem = err as { detail?: string; title?: string };
      showToast(problem.detail || problem.title || 'Erro ao enviar solicitação', 'error');
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Solicitar Alteração"
        description="Solicite a correção de dados sensíveis do seu cadastro. A alteração será revisada por um analista."
      />
      <div className={styles.card}>
        {campo === 'ASSOCIACAO' && (
          <div className={styles.warningBanner} role="alert">
            Se houver distribuição em curso, esta alteração será considerada apenas no próximo processamento.
          </div>
        )}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField label="Campo a alterar" required>
            <Select<SolicitacaoCampo>
              id="solicitacao-campo"
              value={campo}
              onChange={(v) => {
                setCampo(v);
                setValorPretendido('');
                setErrors({});
              }}
              options={CAMPO_OPTIONS}
              aria-label="Campo a alterar"
            />
          </FormField>

          <FormField label="Valor pretendido" required error={errors.valorPretendido}>
            <TextInput
              id="solicitacao-valor"
              value={valorPretendido}
              onChange={(v) => {
                setValorPretendido(v);
                if (errors.valorPretendido) setErrors((p) => ({ ...p, valorPretendido: '' }));
              }}
              placeholder="Informe o novo valor desejado"
            />
          </FormField>

          <FormField label="Justificativa" required error={errors.justificativa}>
            <TextInput
              id="solicitacao-justificativa"
              value={justificativa}
              onChange={(v) => {
                setJustificativa(v);
                if (errors.justificativa) setErrors((p) => ({ ...p, justificativa: '' }));
              }}
              placeholder="Explique o motivo da alteração"
            />
          </FormField>

          <div className={styles.actions}>
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={criarMutation.isPending}>
              {criarMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
