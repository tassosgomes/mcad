import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@components/ui/button';
import { ErrorState } from '@components/ui/error-state';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { Pagination } from '@components/ui/pagination';
import { useAuth } from '@shared/auth';
import { UsuariosMusicaFilters } from '../components/UsuariosMusicaFilters';
import { UsuariosMusicaTable } from '../components/UsuariosMusicaTable';
import { useUsuariosMusica } from '../hooks/useUsuariosMusica';
import type { UsuarioMusicaFiltros } from '../types/usuario-musica';
import styles from './UsuariosMusicaPage.module.css';

const FILTROS_INICIAIS: UsuarioMusicaFiltros = {
  page: 1,
  size: 20,
  sort: 'razaoSocial',
};

export function UsuariosMusicaPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canWrite = hasRole('analista-arrecadacao');
  const [filtros, setFiltros] = useState<UsuarioMusicaFiltros>(FILTROS_INICIAIS);
  const { data, isLoading, error, refetch } = useUsuariosMusica(filtros);

  function handleFiltrosChange(partial: Partial<UsuarioMusicaFiltros>) {
    setFiltros((prev) => ({ ...prev, ...partial }));
  }

  function handleReset() {
    setFiltros(FILTROS_INICIAIS);
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Usuários de Música"
        description="Cadastre e acompanhe empresas licenciadas para uso público de música."
        action={
          canWrite ? (
            <Button
              variant="primary"
              onClick={() => navigate('/arrecadacao/usuarios-musica/novo')}
              type="button"
              id="btn-novo-usuario-musica"
            >
              <Plus size={16} /> Novo Usuário
            </Button>
          ) : undefined
        }
      />

      <UsuariosMusicaFilters filtros={filtros} onChange={handleFiltrosChange} onReset={handleReset} />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message="Erro ao carregar usuários de música" onRetry={refetch} />
      ) : (
        <>
          <UsuariosMusicaTable
            data={data!.data}
            sort={filtros.sort}
            onSortChange={(sort) => setFiltros((prev) => ({ ...prev, sort, page: 1 }))}
          />
          <Pagination
            pagination={data!.pagination}
            onPageChange={(page) => setFiltros((prev) => ({ ...prev, page }))}
          />
        </>
      )}
    </div>
  );
}
