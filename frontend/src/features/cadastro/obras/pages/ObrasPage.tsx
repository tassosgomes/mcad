import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Button } from '@components/ui/button';
import { Pagination } from '@components/ui/pagination';
import { useToast } from '@components/ui/toast';
import { usePermissions } from '@shared/authz/usePermissions';
import { useObras } from '../hooks/useObras';
import { useDeleteObra } from '../hooks/useDeleteObra';
import { ObrasTable } from '../components/ObrasTable';
import { ObrasFilters } from '../components/ObrasFilters';
import { DeleteObraModal } from '../components/DeleteObraModal';
import type { ObraMusical, ObraFiltros } from '../types/obra';
import styles from './ObrasPage.module.css';

export function ObrasPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canCreate = can('cadastro:default:obra:criar');
  const canEdit = can('cadastro:default:obra:editar');
  const canDelete = can('cadastro:default:obra:excluir');
  const createdObraTitle =
    typeof location.state === 'object' && location.state !== null && 'createdObraTitle' in location.state
      ? String(location.state.createdObraTitle)
      : undefined;
  const [filtros, setFiltros] = useState<ObraFiltros>({
    page: 1,
    size: 20,
    sort: 'titulo',
    titulo: createdObraTitle,
  });
  const [obraParaExcluir, setObraParaExcluir] = useState<ObraMusical | null>(null);
  const { data, isLoading, error, refetch } = useObras(filtros);
  const deleteMutation = useDeleteObra();

  async function handleDelete() {
    if (!obraParaExcluir) return;
    try {
      await deleteMutation.mutateAsync(obraParaExcluir.id);
      showToast('Obra excluída com sucesso', 'success');
      setObraParaExcluir(null);
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao excluir obra', 'error');
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Obras Musicais"
        description="Gestão de obras musicais, metadados e códigos ISWC."
        action={canCreate ? (
          <Button
            variant="primary"
            onClick={() => navigate('/cadastro/obras/nova')}
            id="btn-nova-obra"
            type="button"
          >
            <Plus size={16} /> Nova Obra
          </Button>
        ) : undefined}
      />

      <ObrasFilters filtros={filtros} onChange={setFiltros} />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message="Erro ao carregar obras musicais" onRetry={refetch} />
      ) : data ? (
        <>
          <ObrasTable
            data={data.data}
            canWrite={canEdit || canDelete}
            sort={filtros.sort || 'titulo'}
            onSortChange={(sort) => setFiltros((prev) => ({ ...prev, sort, page: 1 }))}
            onEdit={(id) => navigate(`/cadastro/obras/${id}`)}
            onDelete={setObraParaExcluir}
          />
          <Pagination
            pagination={data.pagination}
            onPageChange={(page) => setFiltros((prev) => ({ ...prev, page }))}
          />
        </>
      ) : null}

      <DeleteObraModal
        obra={obraParaExcluir}
        isOpen={!!obraParaExcluir}
        onClose={() => setObraParaExcluir(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
