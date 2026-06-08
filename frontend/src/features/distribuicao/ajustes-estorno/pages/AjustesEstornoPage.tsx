import { useEffect, useState } from 'react';
import { PageHeader } from '@components/ui/page-header';
import { Pagination } from '@components/ui/pagination';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { AjustesEstornoFilters } from '../components/AjustesEstornoFilters';
import { AjustesEstornoTable } from '../components/AjustesEstornoTable';
import { AjusteEstornoDetailDrawer } from '../components/AjusteEstornoDetailDrawer';
import { useAjustesEstorno } from '../hooks/useAjustesEstorno';
import type { AjustesEstornoFiltros } from '../types/ajusteEstorno';
import styles from './AjustesEstornoPage.module.css';

const PAGE_SIZE = 20;

const initialFiltros: AjustesEstornoFiltros = {
  page: 1,
  size: PAGE_SIZE,
};

export function AjustesEstornoPage() {
  const [filtros, setFiltros] = useState<AjustesEstornoFiltros>(initialFiltros);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useAjustesEstorno(filtros);

  useEffect(() => {
    document.title = 'Ajustes por Estorno — mini-ECAD';
  }, []);

  const handleFiltrosChange = (next: AjustesEstornoFiltros) => {
    setFiltros((prev) => ({ ...prev, ...next, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFiltros((prev) => ({ ...prev, page }));
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Ajustes por Estorno"
        description="Consulta dos ajustes gerados a partir de pagamentos estornados na Arrecadação."
      />

      <AjustesEstornoFilters value={filtros} onChange={handleFiltrosChange} />

      {isLoading && <Loading />}

      {error && (
        <ErrorState
          message="Não foi possível carregar os ajustes por estorno."
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !error && data && (
        <>
          <AjustesEstornoTable
            items={data.items}
            onRowClick={setSelectedId}
          />

          {data.totalPages > 1 && (
            <Pagination
              pagination={{
                page: data.page,
                size: data.size,
                total: data.totalItems,
                totalPages: data.totalPages,
              }}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      <AjusteEstornoDetailDrawer
        ajusteId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
