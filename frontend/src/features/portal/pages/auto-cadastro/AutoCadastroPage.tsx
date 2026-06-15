import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormField } from '@components/ui/form-field';
import { TextInput } from '@components/ui/text-input';
import { Button } from '@components/ui/button';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { usePortalAuth } from '../../shared/auth/usePortalAuth';
import styles from './AutoCadastroPage.module.css';

export function AutoCadastroPage() {
  const navigate = useNavigate();
  const { signup } = usePortalAuth();
  const { showToast } = useToast();

  const [documento, setDocumento] = useState('');
  const [caeIpi, setCaeIpi] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!documento.trim()) newErrors.documento = 'CPF/CNPJ é obrigatório';
    if (!caeIpi.trim()) newErrors.caeIpi = 'CAE/IPI é obrigatório';
    if (!senha) newErrors.senha = 'Senha é obrigatória';
    if (senha.length < 4) newErrors.senha = 'A senha deve ter no mínimo 4 caracteres';
    if (senha !== confirmarSenha) newErrors.confirmarSenha = 'As senhas não conferem';
    setErrors(newErrors);
    return Object.keys(newErrors).every((k) => !newErrors[k]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      await signup(documento, caeIpi, senha);
      showToast('Conta criada com sucesso! Faça login para continuar.', 'success');
      navigate('/portal/login', { replace: true });
    } catch (err: unknown) {
      const problem = err as { detail?: string; status?: number };
      if (problem.status === 409) {
        showToast(problem.detail || 'Já existe uma conta para este CPF/CNPJ', 'error');
      } else {
        showToast(problem.detail || 'Erro ao criar conta. Verifique os dados informados.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <PageHeader
          title="Criar Conta"
          description="Cadastre-se para acessar sua área exclusiva de titular."
        />
        <div className={styles.infoBanner}>
          Para criar sua conta, você precisa já existir como titular no sistema ECAD.
          Informe seu CPF/CNPJ e CAE/IPI conforme constam no seu cadastro.
        </div>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField label="CPF / CNPJ" required error={errors.documento}>
            <TextInput
              id="auto-cadastro-documento"
              value={documento}
              onChange={(v) => {
                setDocumento(v);
                if (errors.documento) setErrors((p) => ({ ...p, documento: '' }));
              }}
              placeholder="000.000.000-00 ou 00.000.000/0001-00"
              autoComplete="off"
            />
          </FormField>

          <FormField label="CAE / IPI" required error={errors.caeIpi}>
            <TextInput
              id="auto-cadastro-caeipi"
              value={caeIpi}
              onChange={(v) => {
                setCaeIpi(v);
                if (errors.caeIpi) setErrors((p) => ({ ...p, caeIpi: '' }));
              }}
              placeholder="000.000.00.00"
              autoComplete="off"
            />
          </FormField>

          <FormField label="Senha" required error={errors.senha}>
            <TextInput
              id="auto-cadastro-senha"
              type="password"
              value={senha}
              onChange={(v) => {
                setSenha(v);
                if (errors.senha) setErrors((p) => ({ ...p, senha: '' }));
              }}
              placeholder="Mínimo 4 caracteres"
              autoComplete="new-password"
            />
          </FormField>

          <FormField label="Confirmar Senha" required error={errors.confirmarSenha}>
            <TextInput
              id="auto-cadastro-confirmar-senha"
              type="password"
              value={confirmarSenha}
              onChange={(v) => {
                setConfirmarSenha(v);
                if (errors.confirmarSenha) setErrors((p) => ({ ...p, confirmarSenha: '' }));
              }}
              placeholder="Repita a senha"
              autoComplete="new-password"
            />
          </FormField>

          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting || !documento.trim() || !caeIpi.trim() || !senha || !confirmarSenha}
          >
            {isSubmitting ? 'Criando conta...' : 'Criar Conta'}
          </Button>
        </form>

        <p className={styles.loginLink}>
          Já tem conta?{' '}
          <Link to="/portal/login" className={styles.link}>
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
