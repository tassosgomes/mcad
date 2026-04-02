import { useState, useEffect } from 'react';
import { Select } from '@components/ui/select';
import { TextInput } from '@components/ui/text-input';
import { Button } from '@components/ui/button';
import { FormField } from '@components/ui/form-field';
import type { CaptacaoDetalhe, CriarCaptacaoRequest, AtualizarCaptacaoRequest } from '../types/captacao';
import { useRubricas } from '../hooks/useRubricas';
import styles from './CaptacaoForm.module.css';

interface CaptacaoFormProps {
  initialData?: CaptacaoDetalhe;
  temExecucoes?: boolean;
  onSubmit: (data: CriarCaptacaoRequest | AtualizarCaptacaoRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function CaptacaoForm({
  initialData,
  temExecucoes = false,
  onSubmit,
  onCancel,
  isSubmitting,
}: CaptacaoFormProps) {
  const { data: rubricas, isLoading: isLoadingRubricas } = useRubricas();

  const [rubricaId, setRubricaId] = useState(initialData?.rubrica?.id ?? '');
  const [periodo, setPeriodo] = useState(initialData?.periodo ?? '');
  const [usuarioDeMusica, setUsuarioDeMusica] = useState(initialData?.usuarioDeMusica ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isReadOnly = initialData && initialData.status !== 'ABERTA';

  useEffect(() => {
    if (initialData) {
      setRubricaId(initialData.rubrica.id);
      setPeriodo(initialData.periodo);
      setUsuarioDeMusica(initialData.usuarioDeMusica);
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!rubricaId) newErrors.rubricaId = 'Selecione uma rubrica';
    if (!periodo) newErrors.periodo = 'Informe o período (data)';
    if (!usuarioDeMusica.trim()) newErrors.usuarioDeMusica = 'Informe o usuário de música';
    if (usuarioDeMusica.length > 255) newErrors.usuarioDeMusica = 'Máximo 255 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      rubricaId,
      periodo,
      usuarioDeMusica,
    });
  };

  const rubricaOptions = rubricas?.map(r => ({
    value: r.id,
    label: r.exigeClassificacao ? `${r.nome} ⚡ (Classificação obrigatória)` : r.nome,
  })) ?? [];

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <div className={styles.fieldsGrid}>
        <FormField label="Rubrica" error={errors.rubricaId}>
          <Select
            id="captacao-rubrica"
            value={rubricaId}
            onChange={(val) => setRubricaId(val)}
            disabled={isReadOnly || temExecucoes || isLoadingRubricas}
            options={[{ value: '', label: 'Selecione uma rubrica...' }, ...rubricaOptions]}
          />
        </FormField>

        <FormField label="Período" error={errors.periodo}>
          <input
            type="date"
            className={styles.dateInput}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            disabled={isReadOnly}
          />
        </FormField>

        <div className={styles.fullWidth}>
          <FormField label="Usuário de Música" error={errors.usuarioDeMusica}>
            <TextInput
              id="captacao-usuario"
              value={usuarioDeMusica}
              onChange={(val) => setUsuarioDeMusica(val)}
              placeholder="Ex: Rádio Globo SP, TV Globo, Netflix BR"
              disabled={isReadOnly}
              maxLength={255}
            />
          </FormField>
        </div>
      </div>

      {!isReadOnly && (
        <div className={styles.actions}>
          <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      )}
    </form>
  );
}
