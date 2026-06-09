import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Button } from '@components/ui/button';
import { Pagination } from '@components/ui/pagination';
import { usePermissions } from '@shared/authz';
import { usePagamentos } from '../hooks/usePagamentos';
import { PagamentosTable } from '../components/PagamentosTable';
import { PagamentosFilters } from '../components/PagamentosFilters';
import type { PagamentoFiltros } from '../types/pagamento';
import styles from './PagamentosPage.module.css';

const FILTROS_INICIAIS: PagamentoFiltros = {
  page: 1,
  size: 10,
  sort: 'dataRegistro,desc',
};

export function PagamentosPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const isAnalista = can('arrecadacao:default:pagamento:conciliar');
  const [filtros, setFiltros] = useState<PagamentoFiltros>(FILTROS_INICIAIS);

  const { data, isLoading, error, refetch } = usePagamentos(filtros);

  function handleFiltrosChange(partial: Partial<PagamentoFiltros>) {
    setFiltros((prev) => ({ ...prev, ...partial }));
  }

  function handleReset() {
    setFiltros(FILTROS_INICIAIS);
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Pagamentos"
        description="Gerencie os registros de pagamento das licenças de execução pública."
        action={
          isAnalista ? (
            <Button
              variant="primary"
              onClick={() => navigate('/arrecadacao/pagamentos/novo')}
              id="btn-novo-pagamento"
              type="button"
            >
              <Plus size={16} /> Novo Pagamento
            </Button>
          ) : undefined
        }
      />

      <PagamentosFilters filtros={filtros} onChange={handleFiltrosChange} onReset={handleReset} />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message="Erro ao carregar pagamentos" onRetry={refetch} />
      ) : (
        <>
          <PagamentosTable data={data!.data} />
          <Pagination
            pagination={data!.pagination}
            onPageChange={(page) => setFiltros((prev) => ({ ...prev, page }))}
          />
        </>
      )}
    </div>
  );
}
