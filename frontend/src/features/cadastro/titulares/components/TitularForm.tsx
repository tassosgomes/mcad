import { useState } from 'react';
import { FormField } from '@components/ui/form-field';
import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import { Button } from '@components/ui/button';
import { useAssociacoes } from '../../associacoes/hooks/useAssociacoes';
import { isValidCpf } from '../utils/cpfValidator';
import { isValidCnpj } from '../utils/cnpjValidator';
import {
  formatCpf,
  formatCnpj,
  formatCaeIpi,
} from '../utils/documentFormatter';
import type {
  Titular,
  CriarTitularRequest,
  AtualizarTitularRequest,
  TitularStatus,
  TitularTipo,
} from '../types/titular';
import styles from './TitularForm.module.css';

interface TitularFormProps {
  initialData?: Titular;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const STATUS_OPTIONS = [
  { value: 'ATIVO' as TitularStatus, label: 'Ativo' },
  { value: 'FALECIDO' as TitularStatus, label: 'Falecido' },
  { value: 'TRANSFERINDO' as TitularStatus, label: 'Transferindo' },
];

const TIPO_OPTIONS = [
  { value: 'PF' as TitularTipo, label: 'Pessoa Física (PF)' },
  { value: 'PJ' as TitularTipo, label: 'Pessoa Jurídica (PJ)' },
];

export function TitularForm({ initialData, onSubmit, onCancel, isSubmitting }: TitularFormProps) {
  const isEditMode = !!initialData;
  const { data: assocResp } = useAssociacoes();

  const [tipo, setTipo] = useState<TitularTipo>(initialData?.tipo ?? 'PF');
  const [nome, setNome] = useState(initialData?.nome ?? '');
  // documentoDisplay holds the formatted value shown in the input
  const [documentoDisplay, setDocumentoDisplay] = useState(
    initialData?.documentoFormatado ?? ''
  );
  const [nacionalidade, setNacionalidade] = useState(initialData?.nacionalidade ?? '');
  const [associacaoId, setAssociacaoId] = useState(initialData?.associacao.id ?? '');
  const [status, setStatus] = useState<TitularStatus>(initialData?.status ?? 'ATIVO');
  // CAE/IPI display value (masked)
  const [caeIpiDisplay, setCaeIpiDisplay] = useState(
    initialData?.caeIpi
      ? formatCaeIpi(initialData.caeIpi)
      : ''
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const associacaoOptions =
    assocResp?.map((a: { id: string; sigla: string; nome: string }) => ({
      value: a.id,
      label: `${a.sigla} — ${a.nome}`,
    })) ?? [];

  // ── Mask handlers ────────────────────────────────────────────

  function handleDocumentoChange(raw: string) {
    const masked = tipo === 'PF' ? formatCpf(raw) : formatCnpj(raw);
    setDocumentoDisplay(masked);
    // Clear error on change
    if (errors.documento) setErrors((prev) => ({ ...prev, documento: '' }));
  }

  function handleCaeIpiChange(raw: string) {
    setCaeIpiDisplay(formatCaeIpi(raw));
  }

  // ── Validation ───────────────────────────────────────────────

  function validateDocumento() {
    const raw = documentoDisplay.replace(/[^a-zA-Z0-9]/g, '');
    if (!raw) {
      setErrors((prev) => ({ ...prev, documento: `${tipo === 'PF' ? 'CPF' : 'CNPJ'} é obrigatório` }));
      return false;
    }
    const valid = tipo === 'PF' ? isValidCpf(raw) : isValidCnpj(raw);
    if (!valid) {
      setErrors((prev) => ({ ...prev, documento: `${tipo === 'PF' ? 'CPF' : 'CNPJ'} inválido` }));
      return false;
    }
    setErrors((prev) => ({ ...prev, documento: '' }));
    return true;
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!isEditMode) {
      const raw = documentoDisplay.replace(/[^a-zA-Z0-9]/g, '');
      if (!raw) {
        newErrors.documento = `${tipo === 'PF' ? 'CPF' : 'CNPJ'} é obrigatório`;
      } else {
        const valid = tipo === 'PF' ? isValidCpf(raw) : isValidCnpj(raw);
        if (!valid) newErrors.documento = `${tipo === 'PF' ? 'CPF' : 'CNPJ'} inválido`;
      }
    }
    if (!nacionalidade.trim()) newErrors.nacionalidade = 'Nacionalidade é obrigatória';
    if (!associacaoId) newErrors.associacaoId = 'Associação é obrigatória';
    setErrors(newErrors);
    return Object.keys(newErrors).every((k) => !newErrors[k]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    // Strip masks before sending
    const rawDocumento = documentoDisplay.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const rawCaeIpi = caeIpiDisplay.replace(/\D/g, '') || null;

    if (isEditMode) {
      const payload: AtualizarTitularRequest = {
        nome,
        nacionalidade,
        associacaoId,
        status,
        caeIpi: rawCaeIpi,
      };
      onSubmit(payload);
    } else {
      const payload: CriarTitularRequest = {
        nome,
        tipo,
        documento: rawDocumento,
        nacionalidade,
        associacaoId,
        caeIpi: rawCaeIpi,
      };
      onSubmit(payload);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* Tipo selector — disabled in edit mode */}
      <div className={styles.tipoSection}>
        <span className={styles.tipoLabel}>Tipo de Titular</span>
        <div className={styles.tipoToggle}>
          {TIPO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={[styles.tipoBtn, tipo === opt.value ? styles.tipoActive : ''].join(' ')}
              onClick={() => {
                if (isEditMode) return;
                setTipo(opt.value);
                setDocumentoDisplay(''); // reset mask on type change
              }}
              disabled={isEditMode}
              aria-pressed={tipo === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {isEditMode && (
          <p className={styles.immutableNote}>
            Tipo e documento não podem ser alterados após criação.
          </p>
        )}
      </div>

      <div className={styles.grid}>
        <FormField label="Nome completo" required error={errors.nome} className={styles.fullWidth}>
          <TextInput
            id="titular-nome"
            value={nome}
            onChange={setNome}
            placeholder="Nome completo ou razão social"
          />
        </FormField>

        <FormField
          label={tipo === 'PF' ? 'CPF' : 'CNPJ'}
          required={!isEditMode}
          error={errors.documento}
        >
          <TextInput
            id="titular-documento"
            value={documentoDisplay}
            onChange={handleDocumentoChange}
            placeholder={tipo === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
            mono
            disabled={isEditMode}
            onBlur={!isEditMode ? validateDocumento : undefined}
          />
        </FormField>

        <FormField label="Nacionalidade" required error={errors.nacionalidade}>
          <TextInput
            id="titular-nacionalidade"
            value={nacionalidade}
            onChange={setNacionalidade}
            placeholder="Ex: Brasileira"
          />
        </FormField>

        <FormField label="Associação" required error={errors.associacaoId}>
          <Select
            id="titular-associacao"
            value={associacaoId}
            onChange={setAssociacaoId}
            options={associacaoOptions}
            placeholder="Selecione a associação..."
            error={errors.associacaoId}
          />
        </FormField>

        {isEditMode && (
          <FormField label="Status" required className={styles.fullWidth}>
            <Select<TitularStatus>
              id="titular-status"
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
            />
          </FormField>
        )}

        {/* CAE / IPI Name Number: 000.000.000 */}
        <FormField
          label="CAE / IPI"
          error={errors.caeIpi}
          // eslint-disable-next-line react/no-children-prop
        >
          <TextInput
            id="titular-caeipi"
            value={caeIpiDisplay}
            onChange={handleCaeIpiChange}
            placeholder="000.000.000"
            mono
          />
        </FormField>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
