import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Pagination } from '@components/ui/pagination';
import { useToast } from '@components/ui/toast';
import { useAuth } from '@shared/auth';
import { usePermissions } from '@shared/authz';
import { useDocumentTitle } from '@hooks/useDocumentTitle';

import type { Captacao, CaptacaoFiltros } from '../types/captacao';
import { useCaptacoes } from '../hooks/useCaptacoes';
import { useDeleteCaptacao } from '../hooks/useDeleteCaptacao';
import { CaptacoesTable } from '../components/CaptacoesTable';
import { CaptacaoFilters } from '../components/CaptacaoFilters';
import { DeleteCaptacaoModal } from '../components/DeleteCaptacaoModal';
import styles from './CaptacoesPage.module.css';

export function CaptacoesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { can } = usePermissions();
  const canWrite = can('identificacao:default:captacao:criar');
  const userId = user?.profile.sub;

  const [filtros, setFiltros] = useState<CaptacaoFiltros>({
    page: 1,
    size: 20,
    sort: '-periodo'
  });
  const [captacaoParaExcluir, setCaptacaoParaExcluir] = useState<Captacao | null>(null);

  const { data, isLoading, error, refetch } = useCaptacoes(filtros);
  const deleteMutation = useDeleteCaptacao();

  useDocumentTitle('Captações — Identificação');

  async function handleDelete() {
    if (!captacaoParaExcluir) return;
    try {
      await deleteMutation.mutateAsync(captacaoParaExcluir.id);
      showToast('Captação excluída com sucesso', 'success');
      setCaptacaoParaExcluir(null);
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao excluir captação', 'error');
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Captações"
        description="Gestão, registro e controle de verbas arrecadadas por rubrica e período."
        action={
          canWrite ? (
            <Button onClick={() => navigate('/identificacao/captacoes/nova')}>
              Nova Captação
            </Button>
          ) : undefined
        }
      />

      <CaptacaoFilters filtros={filtros} onChange={setFiltros} />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <CaptacoesTable
            data={data!.data}
            canWrite={canWrite}
            currentUserId={userId ?? ''}
            sort={filtros.sort ?? '-periodo'}
            onSortChange={(sort) => setFiltros(f => ({ ...f, sort, page: 1 }))}
            onView={(id) => navigate(`/identificacao/captacoes/${id}`)}
            onDelete={setCaptacaoParaExcluir}
          />
          <Pagination
            pagination={data!.pagination}
            onPageChange={(page) => setFiltros(f => ({ ...f, page }))}
          />
        </>
      )}

      <DeleteCaptacaoModal
        captacao={captacaoParaExcluir}
        isOpen={!!captacaoParaExcluir}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setCaptacaoParaExcluir(null)}
      />
    </div>
  );
}
