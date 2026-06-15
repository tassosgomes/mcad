import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormField } from '@components/ui/form-field';
import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import { Button } from '@components/ui/button';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { useCriarOcorrencia } from '../../ocorrencias/hooks/useOcorrencias';
import type { OcorrenciaTipo } from '../../ocorrencias/types/ocorrencia';
import styles from './AbrirOcorrenciaPage.module.css';

const TIPO_OPTIONS = [
  { value: 'TITULARIDADE_DIVERGENTE' as const, label: 'Titularidade divergente' },
  { value: 'FONOGRAMA_INCORRETO' as const, label: 'Fonograma incorreto' },
  { value: 'DADO_CADASTRAL' as const, label: 'Dado cadastral errado' },
  { value: 'OBRA_AUSENTE' as const, label: 'Obra ausente' },
];

export function AbrirOcorrenciaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const criarMutation = useCriarOcorrencia();

  const preObraId = searchParams.get('obraId');
  const preFonogramaId = searchParams.get('fonogramaId');
  const preTitulo = searchParams.get('titulo');

  const [tipo, setTipo] = useState<OcorrenciaTipo>('TITULARIDADE_DIVERGENTE');
  const [descricao, setDescricao] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!descricao.trim()) newErrors.descricao = 'Descrição é obrigatória';
    setErrors(newErrors);
    return Object.keys(newErrors).every((k) => !newErrors[k]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      await criarMutation.mutateAsync({
        tipo,
        obraId: preObraId || null,
        fonogramaId: preFonogramaId || null,
        descricao: descricao.trim(),
      });
      showToast('Ocorrência aberta com sucesso!', 'success');
      navigate('/portal/ocorrencias', { replace: true });
    } catch (err: unknown) {
      const problem = err as { detail?: string; title?: string };
      showToast(problem.detail || problem.title || 'Erro ao abrir ocorrência', 'error');
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Abrir Ocorrência"
        description="Reporte um erro no cadastro de obra ou fonograma."
      />
      <div className={styles.card}>
        {preTitulo && (
          <div className={styles.referenceBanner}>
            Referente a: <strong>{preTitulo}</strong>
            {preObraId && ' (obra)'}
            {preFonogramaId && ' (fonograma)'}
          </div>
        )}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField label="Tipo de erro" required>
            <Select<OcorrenciaTipo>
              id="ocorrencia-tipo"
              value={tipo}
              onChange={setTipo}
              options={TIPO_OPTIONS}
              aria-label="Tipo de erro"
            />
          </FormField>

          <FormField label="Descrição" required error={errors.descricao}>
            <TextInput
              id="ocorrencia-descricao"
              value={descricao}
              onChange={(v) => {
                setDescricao(v);
                if (errors.descricao) setErrors((p) => ({ ...p, descricao: '' }));
              }}
              placeholder="Descreva o erro encontrado..."
            />
          </FormField>

          <div className={styles.actions}>
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={criarMutation.isPending}>
              {criarMutation.isPending ? 'Abrindo...' : 'Abrir Ocorrência'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
