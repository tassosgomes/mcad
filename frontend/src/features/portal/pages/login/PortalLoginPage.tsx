import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormField } from '@components/ui/form-field';
import { TextInput } from '@components/ui/text-input';
import { Button } from '@components/ui/button';
import { PageHeader } from '@components/ui/page-header';
import { usePortalAuth } from '../../shared/auth/usePortalAuth';
import styles from './PortalLoginPage.module.css';

export function PortalLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = usePortalAuth();

  if (isAuthenticated) {
    navigate('/portal', { replace: true });
    return null;
  }

  return <LoginForm login={login} navigate={navigate} />;
}

function LoginForm({
  login,
  navigate,
}: {
  login: (documento: string, senha: string) => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [documento, setDocumento] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(documento, senha);
      navigate('/portal', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <PageHeader
          title="Portal do Titular"
          description="Entre com seu CPF/CNPJ e senha para acessar sua área exclusiva."
        />
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          <FormField label="CPF / CNPJ" required>
            <TextInput
              id="portal-login-documento"
              value={documento}
              onChange={setDocumento}
              placeholder="000.000.000-00 ou 00.000.000/0001-00"
              autoComplete="username"
            />
          </FormField>

          <FormField label="Senha" required>
            <TextInput
              id="portal-login-senha"
              type="password"
              value={senha}
              onChange={setSenha}
              placeholder="Sua senha"
              autoComplete="current-password"
            />
          </FormField>

          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting || !documento.trim() || !senha.trim()}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className={styles.signupLink}>
          Ainda não tem conta?{' '}
          <Link to="/portal/auto-cadastro" className={styles.link}>
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
