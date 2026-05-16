import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Pagination } from '@components/ui/pagination';
import { usePermissions } from '@shared/authz';
import { useProcessos } from '../hooks/useProcessos';
import { ProcessosFilters } from '../components/ProcessosFilters';
import { ProcessosTable } from '../components/ProcessosTable';
import type { ProcessoFiltros } from '../types/processo';
import styles from './ProcessosPage.module.css';

const FILTROS_INICIAIS: ProcessoFiltros = {
  page: 1,
  size: 20,
  sort: 'criadoEm:desc',
};

export function ProcessosPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [filtros, setFiltros] = useState<ProcessoFiltros>(FILTROS_INICIAIS);

  const { data, isLoading, error, refetch } = useProcessos(filtros);

  function handleFilterChange(partial: Partial<ProcessoFiltros>) {
    setFiltros((prev) => ({ ...prev, ...partial, page: 1 }));
  }

  function handleClearFilters() {
    setFiltros(FILTROS_INICIAIS);
  }

  const pagination = data?.metadata
    ? {
        page: data.metadata.page,
        size: data.metadata.size,
        total: data.metadata.total,
        totalPages: data.metadata.totalPages,
      }
    : null;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Processos de Distribuição"
        description="Gerencie o ciclo de vida dos processos de distribuição de créditos."
        action={
          can('distribuicao:default:processo:criar') ? (
            <Button
              variant="primary"
              onClick={() => navigate('/distribuicao/processos/novo')}
              id="btn-novo-processo"
              type="button"
            >
              <Plus size={16} /> Novo Processo
            </Button>
          ) : undefined
        }
      />

      <ProcessosFilters
        filtros={filtros}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message="Erro ao carregar processos" onRetry={refetch} />
      ) : (
        <>
          <ProcessosTable data={data?.items ?? []} />
          {pagination && pagination.totalPages > 0 && (
            <Pagination
              pagination={pagination}
              onPageChange={(page) => setFiltros((prev) => ({ ...prev, page }))}
            />
          )}
        </>
      )}
    </div>
  );
}
