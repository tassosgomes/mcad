import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { ErrorState } from '@components/ui/error-state';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { useAuth } from '@shared/auth';
import { UsuarioMusicaForm } from '../components/UsuarioMusicaForm';
import { useUpdateUsuarioMusica } from '../hooks/useUpdateUsuarioMusica';
import { useUsuarioMusica } from '../hooks/useUsuarioMusica';
import type { AtualizarUsuarioMusicaRequest } from '../types/usuario-musica';
import styles from './UsuarioMusicaFormPage.module.css';

export function UsuarioMusicaEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const { data: usuario, isLoading, error, refetch } = useUsuarioMusica(id);
  const updateMutation = useUpdateUsuarioMusica();

  if (!hasRole('analista-arrecadacao')) {
    return <ErrorState message="Seu perfil permite consulta, mas não alteração de usuários de música." />;
  }

  async function handleSubmit(data: AtualizarUsuarioMusicaRequest) {
    try {
      await updateMutation.mutateAsync({ id: id!, data });
      showToast('Usuário de música atualizado com sucesso', 'success');
      navigate(`/arrecadacao/usuarios-musica/${id}`);
    } catch (error: unknown) {
      const problem = error as { detail?: string };
      showToast(problem.detail || 'Erro ao atualizar usuário de música', 'error');
    }
  }

  if (isLoading) return <Loading />;
  if (error || !usuario) {
    return <ErrorState message="Usuário de música não encontrado" onRetry={refetch} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/arrecadacao/usuarios-musica/${usuario.id}`)}
          type="button"
          id="btn-back-editar-usuario-musica"
        >
          <ArrowLeft size={16} /> Detalhes
        </Button>
        <PageHeader title={usuario.razaoSocial} description="Editar dados cadastrais do usuário de música." />
      </div>
      <div className={styles.card}>
        <UsuarioMusicaForm
          initialData={usuario}
          onSubmit={(payload) => handleSubmit(payload as AtualizarUsuarioMusicaRequest)}
          onCancel={() => navigate(`/arrecadacao/usuarios-musica/${usuario.id}`)}
          isSubmitting={updateMutation.isPending}
        />
      </div>
    </div>
  );
}
