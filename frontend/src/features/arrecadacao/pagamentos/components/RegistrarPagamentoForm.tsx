import { useState, useMemo } from 'react';
import { FormField } from '@components/ui/form-field';
import { Button } from '@components/ui/button';
import { Autocomplete } from '@components/ui/autocomplete';
import { useDebounce } from '@hooks/useDebounce';
import { getLicencas } from '../../licencas/api/licencasApi';
import { useQuery } from '@tanstack/react-query';
import { useUdaVigente } from '../../uda/hooks/useUdaVigente';
import { useRegistrarPagamento } from '../hooks/useRegistrarPagamento';
import { formatBRL } from '../../shared/utils/formatCurrency';
import type { Licenca } from '../../licencas/types/licenca';
import styles from './RegistrarPagamentoForm.module.css';

interface RegistrarPagamentoFormProps {
  onSuccess: (id: string) => void;
  onCancel: () => void;
}

function getPeriodoAtual(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function RegistrarPagamentoForm({ onSuccess, onCancel }: RegistrarPagamentoFormProps) {
  const [licencaId, setLicencaId] = useState('');
  const [licencaDisplay, setLicencaDisplay] = useState('');
  const [licencaBusca, setLicencaBusca] = useState('');
  const [quantidadeUdas, setQuantidadeUdas] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const licencaBuscaDebounced = useDebounce(licencaBusca, 300);
  const { data: udaVigente, isError: semUda } = useUdaVigente();
  const mutation = useRegistrarPagamento();

  const { data: licencasData, isFetching: isFetchingLicencas } = useQuery({
    queryKey: ['licencas-search-pagamento', licencaBuscaDebounced],
    queryFn: () => getLicencas({
      page: 0,
      size: 10,
      sort: 'criadoEm,desc',
      razaoSocial: licencaBuscaDebounced,
    }),
    enabled: licencaBuscaDebounced.length >= 2,
  });

  const licencasResults: Licenca[] = (licencasData?.data ?? []).filter(
    (l) => l.status === 'ATIVA' || l.status === 'SUSPENSA'
  );

  // Preview calculation
  const previewValor = useMemo(() => {
    if (!udaVigente || !quantidadeUdas) return null;
    const qty = parseFloat(quantidadeUdas);
    const uda = parseFloat(udaVigente.valor);
    if (isNaN(qty) || isNaN(uda) || qty <= 0) return null;
    return (qty * uda).toFixed(6);
  }, [quantidadeUdas, udaVigente]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!licencaId) newErrors.licencaId = 'Selecione uma licença';
    const qty = parseFloat(quantidadeUdas);
    if (!quantidadeUdas || isNaN(qty) || qty <= 0) {
      newErrors.quantidadeUdas = 'Quantidade de UDAs deve ser maior que zero';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).every((k) => !newErrors[k]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({ licencaId, quantidadeUdas }, {
      onSuccess: (data) => {
        onSuccess(data.id);
      },
      onError: (err: unknown) => {
        const problem = err as { detail?: string; status?: number };
        if (problem.status === 409) {
          setErrors({ licencaId: `Já existe pagamento confirmado para esta licença no período ${getPeriodoAtual()}` });
        } else {
          setErrors({ submit: problem.detail || 'Erro ao registrar pagamento' });
        }
      },
    });
  }

  const periodoAtual = getPeriodoAtual();

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {semUda && (
        <div className={styles.alertUda}>
          ⚠️ Nenhum valor de UDA configurado. Contate o administrador.
        </div>
      )}

      <FormField label="Licença" required error={errors.licencaId} className={styles.fullWidth}>
        <Autocomplete<Licenca>
          id="pagamento-licenca"
          placeholder="Buscar licença por razão social (mín. 2 caracteres)..."
          value={licencaDisplay}
          onSearch={(q) => {
            setLicencaBusca(q);
            if (!q) {
              setLicencaId('');
              setLicencaDisplay('');
            }
          }}
          results={licencasResults}
          isLoading={isFetchingLicencas}
          renderItem={(l, highlighted) => (
            <div className={highlighted ? styles.autocompleteItemHighlighted : styles.autocompleteItem}>
              <span className={styles.autocompleteRazaoSocial}>{l.usuarioMusica.razaoSocial}</span>
              <span className={styles.autocompleteMeta}>
                {l.rubrica.sigla} · {l.status}
              </span>
            </div>
          )}
          onSelect={(l) => {
            setLicencaId(l.id);
            setLicencaDisplay(`${l.usuarioMusica.razaoSocial} — ${l.rubrica.sigla}`);
            setErrors((prev) => ({ ...prev, licencaId: '' }));
          }}
          minChars={2}
        />
      </FormField>

      {udaVigente && (
        <div className={styles.udaInfo}>
          <span className={styles.udaLabel}>UDA Vigente:</span>
          <span className={styles.udaValor}>{formatBRL(udaVigente.valor)}</span>
        </div>
      )}

      <div className={styles.row}>
        <FormField label="Quantidade de UDAs" required error={errors.quantidadeUdas}>
          <input
            id="pagamento-quantidade-udas"
            className={styles.input}
            type="number"
            step="0.000001"
            min="0.000001"
            placeholder="Ex: 2.5"
            value={quantidadeUdas}
            disabled={semUda}
            onChange={(e) => {
              setQuantidadeUdas(e.target.value);
              setErrors((prev) => ({ ...prev, quantidadeUdas: '' }));
            }}
          />
        </FormField>

        <FormField label="Período">
          <input
            id="pagamento-periodo"
            className={`${styles.input} ${styles.inputReadOnly}`}
            type="text"
            value={periodoAtual}
            readOnly
            aria-label="Período (automático — mês corrente)"
          />
        </FormField>
      </div>

      {previewValor && (
        <div className={styles.preview}>
          <span className={styles.previewLabel}>Valor estimado:</span>
          <span className={styles.previewValor}>{formatBRL(previewValor)}</span>
          <span className={styles.previewDetail}>
            ({quantidadeUdas} UDAs × {udaVigente ? formatBRL(udaVigente.valor) : '…'})
          </span>
        </div>
      )}

      {errors.submit && (
        <div className={styles.errorSubmit}>{errors.submit}</div>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={mutation.isPending || semUda}>
          {mutation.isPending ? 'Registrando...' : 'Registrar Pagamento'}
        </Button>
      </div>
    </form>
  );
}
