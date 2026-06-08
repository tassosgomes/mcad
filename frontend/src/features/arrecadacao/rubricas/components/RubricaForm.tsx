import { useState, type FormEvent, useRef } from 'react';
import { Button } from '@components/ui/button';
import { FormField } from '@components/ui/form-field';
import { TextInput } from '@components/ui/text-input';
import { usePermissions } from '@shared/authz';
import type { AtualizarRubricaData, CriarRubricaData, Rubrica } from '../types/rubrica';
import styles from './RubricaForm.module.css';

function gerarSiglaSugestao(nome: string): string {
  const preposicoes = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'EM', 'NO', 'NA', 'A', 'O', 'E', 'PARA', 'POR', 'COM']);
  let normalizado = nome
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s\-]/g, ' ');
  const palavras = normalizado.split(/[\s\-]+/).filter(Boolean);
  let significativas = palavras.filter((p) => !preposicoes.has(p));
  if (significativas.length === 0) significativas = palavras;
  let sigla = significativas.map((p) => p[0]).join('_');
  if (sigla.length < 3 && significativas.length > 0) {
    sigla = significativas[0].substring(0, Math.min(3, significativas[0].length));
  }
  if (sigla.length > 20) sigla = sigla.substring(0, 20);
  return sigla;
}

type RubricaFormPayload = CriarRubricaData | AtualizarRubricaData;

interface RubricaFormProps {
  initialData?: Rubrica;
  onSubmit: (data: RubricaFormPayload) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function RubricaForm({ initialData, onSubmit, onCancel, isSubmitting }: RubricaFormProps) {
  const { can } = usePermissions();
  const canWrite = can('arrecadacao:default:rubrica:editar');
  const isEditMode = !!initialData;

  const [nome, setNome] = useState(initialData?.nome ?? '');
  const [exigeClassificacao, setExigeClassificacao] = useState(initialData?.exigeClassificacao ?? false);
  const [sigla, setSigla] = useState(initialData?.sigla ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const siglaManual = useRef(false);

  function setFieldError(field: string, message: string) {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  function handleNomeChange(value: string) {
    setNome(value);
    if (errors.nome) setFieldError('nome', '');
    if (!isEditMode && !siglaManual.current) {
      const sugestao = gerarSiglaSugestao(value);
      setSigla(sugestao);
    }
  }

  function handleSiglaChange(value: string) {
    siglaManual.current = true;
    setSigla(value.toUpperCase());
    if (errors.sigla) setFieldError('sigla', '');
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (nome.trim().length < 3) nextErrors.nome = 'Nome deve ter no mínimo 3 caracteres';
    if (sigla.length > 20) nextErrors.sigla = 'Sigla deve ter no máximo 20 caracteres';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      nome: nome.trim(),
      exigeClassificacao,
    };

    if (isEditMode) {
      onSubmit(payload);
      return;
    }

    onSubmit({
      ...payload,
      sigla: sigla.trim() || undefined,
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <section className={styles.section}>
        <div className={styles.grid}>
          <FormField label="Nome" required error={errors.nome} className={styles.fullWidth}>
            <TextInput
              id="rubrica-nome"
              value={nome}
              onChange={handleNomeChange}
              placeholder="Nome da rubrica"
              disabled={!canWrite}
            />
          </FormField>
          <FormField
            label="Sigla"
            error={errors.sigla}
            className={styles.fullWidth}
          >
            <TextInput
              id="rubrica-sigla"
              value={sigla}
              onChange={handleSiglaChange}
              placeholder="Sigla (deixe em branco para gerar automaticamente)"
              disabled={isEditMode || !canWrite}
              maxLength={20}
              mono
            />
          </FormField>
          <FormField label="" className={styles.fullWidth}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={exigeClassificacao}
                onChange={(e) => setExigeClassificacao(e.target.checked)}
                disabled={!canWrite}
                className={styles.checkbox}
              />
              <span>Exige classificação</span>
            </label>
          </FormField>
        </div>
      </section>

      {canWrite && (
        <div className={styles.actions}>
          <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Cadastrar rubrica'}
          </Button>
        </div>
      )}
    </form>
  );
}
