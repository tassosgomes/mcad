import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Button } from '@components/ui/button';
import { Pagination } from '@components/ui/pagination';
import { usePermissions } from '@shared/authz';
import { useLicencas } from '../hooks/useLicencas';
import { LicencasTable } from '../components/LicencasTable';
import { LicencasFilters } from '../components/LicencasFilters';
import type { LicencaFiltros } from '../types/licenca';
import styles from './LicencasPage.module.css';

const FILTROS_INICIAIS: LicencaFiltros = {
  page: 0,
  size: 10,
  sort: 'criadoEm,desc',
};

export function LicencasPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const isAnalista = can('arrecadacao:default:contrato:criar');
  const [filtros, setFiltros] = useState<LicencaFiltros>(FILTROS_INICIAIS);

  const { data, isLoading, error, refetch } = useLicencas(filtros);

  function handleFiltrosChange(partial: Partial<LicencaFiltros>) {
    setFiltros((prev) => ({ ...prev, ...partial }));
  }

  function handleReset() {
    setFiltros(FILTROS_INICIAIS);
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Licenças"
        description="Gerencie as licenças de execução pública dos usuários de música."
        action={
          isAnalista ? (
            <Button
              variant="primary"
              onClick={() => navigate('/arrecadacao/licencas/nova')}
              id="btn-nova-licenca"
              type="button"
            >
              <Plus size={16} /> Nova Licença
            </Button>
          ) : undefined
        }
      />

      <LicencasFilters filtros={filtros} onChange={handleFiltrosChange} onReset={handleReset} />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message="Erro ao carregar licenças" onRetry={refetch} />
      ) : (
        <>
          <LicencasTable data={data!.data} />
          <Pagination
            pagination={data!.pagination}
            onPageChange={(page) => setFiltros((prev) => ({ ...prev, page }))}
          />
        </>
      )}
    </div>
  );
}
