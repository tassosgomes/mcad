import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, RefreshCw } from 'lucide-react';
import { Button } from '@components/ui/button';
import { ErrorState } from '@components/ui/error-state';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { useAuth } from '@shared/auth/useAuth';
import { CalculoSummary } from '../components/CalculoSummary';
import { CreditosFilters } from '../components/CreditosFilters';
import { CreditosTable } from '../components/CreditosTable';
import { useCalcularProcesso, useProcessoCalculo } from '../hooks/useProcessoCalculo';
import type { CalculoProcessoFilters, CategoriaCredito, ProblemDetails } from '../types/calculo';
import styles from './ProcessoCalculoPage.module.css';

const PAGE_SIZE = 20;

interface UiFilters {
  categoria: CategoriaCredito | '';
  titularId: string;
  obraId: string;
}

const initialFilters: UiFilters = {
  categoria: '',
  titularId: '',
  obraId: '',
};

function toProblemDetails(error: unknown): ProblemDetails {
  if (typeof error === 'object' && error !== null) {
    return error as ProblemDetails;
  }

  return {
    title: 'Erro inesperado',
    detail: 'Não foi possível concluir a operação.',
  };
}

function problemMessage(error: unknown): string {
  const problem = toProblemDetails(error);
  return problem.detail || problem.title || 'Não foi possível concluir a operação.';
}

export function ProcessoCalculoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // TODO Fase F: substituir hasRole('analista-distribuicao') por can('distribuicao:default:processo:calcular')
  // assim que o catálogo de permissões da distribuicao-api estiver definido. Hoje o serviço de
  // distribuição ainda é um placeholder ("planned" no vision.md) e não publica permissões.
  const { hasRole } = useAuth();
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<UiFilters>(initialFilters);
  const processoId = id ?? '';

  const queryFilters: CalculoProcessoFilters = {
    page,
    size: PAGE_SIZE,
    categoria: filters.categoria,
    titularId: filters.titularId.trim(),
    obraId: filters.obraId.trim(),
  };

  const calculoQuery = useProcessoCalculo(processoId, queryFilters);
  const calcularMutation = useCalcularProcesso(processoId);
  const isAnalyst = hasRole('analista-distribuicao');
  const canCalculate = isAnalyst && calculoQuery.data?.status === 'CRIADO';

  useEffect(() => {
    document.title = 'Cálculo do processo — mini-ECAD';
  }, []);

  const handleFiltersChange = (nextFilters: UiFilters) => {
    setFilters(nextFilters);
    setPage(0);
  };

  const handleCalculate = async () => {
    try {
      await calcularMutation.mutateAsync();
    } catch {
      // Mutation error is rendered from React Query state below.
    }
  };

  if (!processoId) {
    return <ErrorState message="Processo de distribuição não informado." />;
  }

  if (calculoQuery.isLoading) {
    return <Loading />;
  }

  if (calculoQuery.error || !calculoQuery.data) {
    return (
      <ErrorState
        message={problemMessage(calculoQuery.error)}
        onRetry={() => void calculoQuery.refetch()}
      />
    );
  }

  const calculo = calculoQuery.data;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => navigate('/distribuicao/rubricas')}
        >
          <ArrowLeft size={16} /> Distribuição
        </Button>
      </div>

      <PageHeader
        title={`Processo ${processoId.slice(0, 8).toUpperCase()}`}
        description="Revisão dos créditos calculados para conferência antes da aprovação."
        action={
          isAnalyst ? (
            <Button
              type="button"
              onClick={() => void handleCalculate()}
              disabled={!canCalculate || calcularMutation.isPending}
            >
              {calcularMutation.isPending ? <RefreshCw size={16} /> : <Calculator size={16} />}
              Calcular
            </Button>
          ) : null
        }
      />

      {isAnalyst && calculo.status !== 'CRIADO' && (
        <div className={styles.readOnlyNotice}>
          Cálculo disponível apenas para processos em status Criado.
        </div>
      )}

      {!isAnalyst && (
        <div className={styles.readOnlyNotice}>
          Consulta em modo somente leitura.
        </div>
      )}

      {calcularMutation.error && (
        <div className={styles.errorPanel} role="alert">
          <strong>Não foi possível calcular o processo.</strong>
          <span>{problemMessage(calcularMutation.error)}</span>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => void handleCalculate()}
            disabled={!canCalculate || calcularMutation.isPending}
          >
            <RefreshCw size={16} /> Tentar novamente
          </Button>
        </div>
      )}

      <CalculoSummary calculo={calculo} />

      <section className={styles.reviewSection} aria-labelledby="creditos-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="creditos-title">Créditos calculados</h2>
            <p>Detalhamento por titular, obra, fonograma, categoria e valor.</p>
          </div>
        </div>

        <CreditosFilters value={filters} onChange={handleFiltersChange} />

        {calculoQuery.isFetching && (
          <div className={styles.refreshing} role="status">
            Atualizando créditos...
          </div>
        )}

        <CreditosTable
          creditos={calculo.creditos.items}
          metadata={calculo.creditos.metadata}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}
