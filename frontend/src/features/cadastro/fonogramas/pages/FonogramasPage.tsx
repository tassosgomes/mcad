import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Button } from '@components/ui/button';
import { Pagination } from '@components/ui/pagination';
import { useToast } from '@components/ui/toast';
import { usePermissions } from '@shared/authz/usePermissions';
import { useFonogramas } from '../hooks/useFonogramas';
import { useDeleteFonograma } from '../hooks/useDeleteFonograma';
import { FonogramasTable } from '../components/FonogramasTable';
import { FonogramasFilters } from '../components/FonogramasFilters';
import { DeleteFonogramaModal } from '../components/DeleteFonogramaModal';
import { formatIsrc } from '../utils/isrcFormatter';
import type { FonogramaResumo, FonogramaFiltros } from '../types/fonograma';
import styles from './FonogramasPage.module.css';

export function FonogramasPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canCreate = can('cadastro:default:fonograma:criar');
  const canEdit = can('cadastro:default:fonograma:editar');
  const canDelete = can('cadastro:default:fonograma:excluir');
  const [filtros, setFiltros] = useState<FonogramaFiltros>({ page: 1, size: 20, sort: 'isrc' });
  const [fonoParaExcluir, setFonoParaExcluir] = useState<FonogramaResumo | null>(null);
  const { data, isLoading, error, refetch } = useFonogramas(filtros);
  const deleteMutation = useDeleteFonograma();

  async function handleDelete() {
    if (!fonoParaExcluir) return;
    try {
      await deleteMutation.mutateAsync(fonoParaExcluir.id);
      showToast('Fonograma excluído com sucesso', 'success');
      setFonoParaExcluir(null);
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao excluir fonograma', 'error');
    }
  }

  const handleFiltrosChange = (change: Partial<FonogramaFiltros>) => {
    setFiltros((prev) => ({ ...prev, ...change }));
  };

  const handleResetFilters = () => {
    setFiltros({ page: 1, size: 20, sort: 'isrc' });
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Gestão de Fonogramas"
        description="Listagem, busca e gerenciamento de registros e códigos ISRC."
        action={canCreate ? (
          <Button
            variant="primary"
            onClick={() => navigate('/cadastro/fonogramas/novo')}
            type="button"
          >
            <Plus size={16} /> Novo Fonograma
          </Button>
        ) : undefined}
      />

      <FonogramasFilters
        filters={filtros}
        onChange={handleFiltrosChange}
        onReset={handleResetFilters}
      />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message="Erro ao carregar fonogramas" onRetry={refetch} />
      ) : data ? (
        <>
          <FonogramasTable
            data={data.data}
            canWrite={canEdit || canDelete}
            sort={filtros.sort || 'isrc'}
            onSortChange={(sort) => setFiltros((prev) => ({ ...prev, sort, page: 1 }))}
            onEdit={(id) => navigate(`/cadastro/fonogramas/${id}`)}
            onDelete={setFonoParaExcluir}
          />
          <Pagination
            pagination={data.pagination}
            onPageChange={(page) => setFiltros((prev) => ({ ...prev, page }))}
          />
        </>
      ) : null}

      <DeleteFonogramaModal
        isOpen={!!fonoParaExcluir}
        onClose={() => setFonoParaExcluir(null)}
        onConfirm={handleDelete}
        isrcFormatted={fonoParaExcluir ? formatIsrc(fonoParaExcluir.isrcFormatado) : ''}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
