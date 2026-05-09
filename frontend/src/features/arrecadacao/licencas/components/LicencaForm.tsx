import { useState } from 'react';
import { FormField } from '@components/ui/form-field';
import { Select } from '@components/ui/select';
import { Button } from '@components/ui/button';
import { Autocomplete } from '@components/ui/autocomplete';
import { useDebounce } from '@hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import { apiGetArr } from '@services/apiArrecadacaoClient';
import type { CriarLicencaRequest, UsuarioMusicaResumo } from '../types/licenca';
import styles from './LicencaForm.module.css';

interface LicencaFormProps {
  onSubmit: (data: CriarLicencaRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface RubricaResumo {
  id: string;
  sigla: string;
  nome: string;
}

interface BackendUsuarioMusicaItem {
  id: string;
  razaoSocial: string;
  cnpj?: string;
  cnpjValor?: string;
  cnpjFormatado?: string;
}

interface BackendUsuarioMusicaPage {
  items: BackendUsuarioMusicaItem[];
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function LicencaForm({ onSubmit, onCancel, isSubmitting }: LicencaFormProps) {
  const [usuarioMusicaId, setUsuarioMusicaId] = useState('');
  const [usuarioDisplay, setUsuarioDisplay] = useState('');
  const [usuarioBusca, setUsuarioBusca] = useState('');
  const [rubricaId, setRubricaId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const usuarioBuscaDebounced = useDebounce(usuarioBusca, 300);

  const { data: usuariosData, isFetching: isFetchingUsuarios } = useQuery({
    queryKey: ['usuarios-musica-search', usuarioBuscaDebounced],
    queryFn: () =>
      apiGetArr<BackendUsuarioMusicaPage>(
        `/usuarios-musica?razaoSocial=${encodeURIComponent(usuarioBuscaDebounced)}&status=ATIVO&size=10`
      ),
    enabled: usuarioBuscaDebounced.length >= 2,
  });

  const usuariosResults: UsuarioMusicaResumo[] = (usuariosData?.items ?? []).map((u) => ({
    id: u.id,
    razaoSocial: u.razaoSocial,
    cnpjFormatado: u.cnpjFormatado ?? u.cnpj ?? u.cnpjValor ?? '',
  }));

  const { data: rubricasData } = useQuery({
    queryKey: ['rubricas-arrecadacao'],
    queryFn: () => apiGetArr<RubricaResumo[]>('/rubricas'),
    staleTime: 5 * 60 * 1000,
  });

  const rubricaOptions = (rubricasData ?? []).map((r) => ({
    value: r.id,
    label: r.nome,
  }));

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!usuarioMusicaId) newErrors.usuarioMusicaId = 'Usuário de música é obrigatório';
    if (!rubricaId) newErrors.rubricaId = 'Rubrica é obrigatória';
    if (!dataInicio) {
      newErrors.dataInicio = 'Data de início é obrigatória';
    } else if (dataInicio < getTodayStr()) {
      newErrors.dataInicio = 'Data de início deve ser hoje ou no futuro';
    }
    if (dataFim && dataFim <= dataInicio) {
      newErrors.dataFim = 'Data de fim deve ser posterior à data de início';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).every((k) => !newErrors[k]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      usuarioMusicaId,
      rubricaId,
      dataInicio,
      dataFim: dataFim || null,
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.grid}>
        <FormField
          label="Usuário de Música"
          required
          error={errors.usuarioMusicaId}
          className={styles.fullWidth}
        >
          <Autocomplete<UsuarioMusicaResumo>
            id="licenca-usuario"
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
            renderItem={(u, highlighted) => (
              <div className={highlighted ? styles.autocompleteItemHighlighted : styles.autocompleteItem}>
                <span className={styles.autocompleteRazaoSocial}>{u.razaoSocial}</span>
                <span className={styles.autocompleteCnpj}>{u.cnpjFormatado}</span>
              </div>
            )}
            onSelect={(u) => {
              setUsuarioMusicaId(u.id);
              setUsuarioDisplay(u.razaoSocial);
              setErrors((prev) => ({ ...prev, usuarioMusicaId: '' }));
            }}
            minChars={2}
          />
        </FormField>

        <FormField label="Rubrica" required error={errors.rubricaId}>
          <Select<string>
            id="licenca-rubrica"
            value={rubricaId}
            onChange={(val) => {
              setRubricaId(val);
              setErrors((prev) => ({ ...prev, rubricaId: '' }));
            }}
            options={rubricaOptions}
            placeholder="Selecione a rubrica..."
            error={errors.rubricaId}
          />
        </FormField>

        <FormField label="Data de Início" required error={errors.dataInicio}>
          <input
            id="licenca-data-inicio"
            className={styles.dateInput}
            type="date"
            value={dataInicio}
            min={getTodayStr()}
            onChange={(e) => {
              setDataInicio(e.target.value);
              setErrors((prev) => ({ ...prev, dataInicio: '' }));
            }}
          />
        </FormField>

        <FormField label="Data de Fim" error={errors.dataFim}>
          <input
            id="licenca-data-fim"
            className={styles.dateInput}
            type="date"
            value={dataFim}
            min={dataInicio || getTodayStr()}
            onChange={(e) => {
              setDataFim(e.target.value);
              setErrors((prev) => ({ ...prev, dataFim: '' }));
            }}
          />
          <p className={styles.hint}>Deixe em branco para licença por tempo indeterminado</p>
        </FormField>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Criar Licença'}
        </Button>
      </div>
    </form>
  );
}
