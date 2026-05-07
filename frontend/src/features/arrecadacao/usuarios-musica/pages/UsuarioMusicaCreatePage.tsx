import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { ErrorState } from '@components/ui/error-state';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { useAuth } from '@shared/auth';
import { UsuarioMusicaForm } from '../components/UsuarioMusicaForm';
import { useCreateUsuarioMusica } from '../hooks/useCreateUsuarioMusica';
import type { CriarUsuarioMusicaRequest } from '../types/usuario-musica';
import styles from './UsuarioMusicaFormPage.module.css';

export function UsuarioMusicaCreatePage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const createMutation = useCreateUsuarioMusica();

  if (!hasRole('analista-arrecadacao')) {
    return <ErrorState message="Seu perfil permite consulta, mas não cadastro de usuários de música." />;
  }

  async function handleSubmit(data: CriarUsuarioMusicaRequest) {
    try {
      await createMutation.mutateAsync(data);
      showToast('Usuário de música cadastrado com sucesso', 'success');
      navigate('/arrecadacao/usuarios-musica');
    } catch (error: unknown) {
      const problem = error as { detail?: string; status?: number };
      showToast(problem.detail || 'Erro ao cadastrar usuário de música', 'error');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/arrecadacao/usuarios-musica')}
          type="button"
          id="btn-back-criar-usuario-musica"
        >
          <ArrowLeft size={16} /> Usuários de Música
        </Button>
        <PageHeader title="Novo Usuário de Música" description="Cadastro de estabelecimento licenciado." />
      </div>
      <div className={styles.card}>
        <UsuarioMusicaForm
          onSubmit={(payload) => handleSubmit(payload as CriarUsuarioMusicaRequest)}
          onCancel={() => navigate('/arrecadacao/usuarios-musica')}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </div>
  );
}
