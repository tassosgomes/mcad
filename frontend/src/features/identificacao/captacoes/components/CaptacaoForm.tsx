import { useState, useEffect } from 'react';
import { Select } from '@components/ui/select';
import { Button } from '@components/ui/button';
import { FormField } from '@components/ui/form-field';
import { Autocomplete } from '@components/ui/autocomplete';
import type { CaptacaoDetalhe, CriarCaptacaoRequest, AtualizarCaptacaoRequest } from '../types/captacao';
import type { UsuarioMusicaSnapshot } from '../types/usuario-musica-snapshot';
import { useRubricas } from '../hooks/useRubricas';
import { useBuscaUsuariosMusica } from '../hooks/useBuscaUsuariosMusica';
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
  const [usuarioMusicaId, setUsuarioMusicaId] = useState(initialData?.usuarioMusicaId ?? '');
  const [usuarioDisplay, setUsuarioDisplay] = useState(initialData?.usuarioMusicaNome ?? '');
  const [usuarioBusca, setUsuarioBusca] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isReadOnly = initialData && initialData.status?.toUpperCase() !== 'ABERTA';

  const { results: usuariosResults, isFetching: isFetchingUsuarios } = useBuscaUsuariosMusica(usuarioBusca);

  useEffect(() => {
    if (initialData) {
      setRubricaId(initialData.rubrica.id);
      setPeriodo(initialData.periodo);
      setUsuarioMusicaId(initialData.usuarioMusicaId ?? '');
      setUsuarioDisplay(initialData.usuarioMusicaNome ?? '');
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!rubricaId) newErrors.rubricaId = 'Selecione uma rubrica';
    if (!periodo) newErrors.periodo = 'Informe o período (data)';
    if (!usuarioMusicaId) newErrors.usuarioMusicaId = 'Selecione um usuário de música';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      rubricaId,
      periodo,
      usuarioMusicaId,
      usuarioMusicaNome: usuarioDisplay,
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
            id="captacao-periodo"
            className={styles.dateInput}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            disabled={isReadOnly}
          />
        </FormField>

        <div className={styles.fullWidth}>
          <FormField label="Usuário de Música" required error={errors.usuarioMusicaId}>
            <Autocomplete<UsuarioMusicaSnapshot>
              id="captacao-usuario"
              placeholder="Buscar por razão social (mín. 2 caracteres)..."
              value={usuarioDisplay}
              onSearch={(q) => {
                setUsuarioBusca(q);
                if (!q) {
                  setUsuarioMusicaId('');
                  setUsuarioDisplay('');
                }
              }}
              results={usuariosResults}
              isLoading={isFetchingUsuarios}
              renderItem={(u, _highlighted) => (
                <div>
                  <span>{u.razaoSocial}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginLeft: 'var(--space-2)' }}>
                    {u.cnpjFormatado || u.cnpj}
                  </span>
                </div>
              )}
              onSelect={(u) => {
                setUsuarioMusicaId(u.id);
                setUsuarioDisplay(u.razaoSocial);
                setErrors((prev) => ({ ...prev, usuarioMusicaId: '' }));
              }}
              minChars={2}
              disabled={isReadOnly}
              emptyStateMessage="Nenhum usuário encontrado. Verifique o cadastro na Arrecadação."
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
