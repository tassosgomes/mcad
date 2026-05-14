import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Button } from '@components/ui/button';
import { Pagination } from '@components/ui/pagination';
import { useToast } from '@components/ui/toast';
import { usePermissions } from '@shared/authz/usePermissions';
import { useTitulares } from '../hooks/useTitulares';
import { useDeleteTitular } from '../hooks/useDeleteTitular';
import { TitularesTable } from '../components/TitularesTable';
import { TitularesFilters } from '../components/TitularesFilters';
import { DeleteTitularModal } from '../components/DeleteTitularModal';
import type { Titular, TitularFiltros } from '../types/titular';
import styles from './TitularesPage.module.css';

export function TitularesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canCreate = can('cadastro:default:titular:criar');
  const canEdit = can('cadastro:default:titular:editar');
  const canDelete = can('cadastro:default:titular:excluir');
  const [filtros, setFiltros] = useState<TitularFiltros>({ page: 1, size: 20, sort: 'nome' });
  const [titularParaExcluir, setTitularParaExcluir] = useState<Titular | null>(null);
  const { data, isLoading, error, refetch } = useTitulares(filtros);
  const deleteMutation = useDeleteTitular();

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(titularParaExcluir!.id);
      showToast('Titular excluído com sucesso', 'success');
      setTitularParaExcluir(null);
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao excluir titular', 'error');
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Titulares"
        description="Pessoas físicas e jurídicas titulares de direitos autorais registrados no sistema."
        action={canCreate ? (
          <Button
            variant="primary"
            onClick={() => navigate('/cadastro/titulares/novo')}
            id="btn-novo-titular"
            type="button"
          >
            <UserPlus size={16} /> Novo Titular
          </Button>
        ) : undefined}
      />

      <TitularesFilters filtros={filtros} onChange={setFiltros} />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message="Erro ao carregar titulares" onRetry={refetch} />
      ) : (
        <>
          <TitularesTable
            data={data!.data}
            canWrite={canEdit || canDelete}
            sort={filtros.sort}
            onSortChange={(sort) => setFiltros((prev) => ({ ...prev, sort, page: 1 }))}
            onEdit={(id) => navigate(`/cadastro/titulares/${id}/editar`)}
            onDelete={setTitularParaExcluir}
          />
          <Pagination
            pagination={data!.pagination}
            onPageChange={(page) => setFiltros((prev) => ({ ...prev, page }))}
          />
        </>
      )}

      <DeleteTitularModal
        titular={titularParaExcluir}
        isOpen={!!titularParaExcluir}
        onClose={() => setTitularParaExcluir(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
