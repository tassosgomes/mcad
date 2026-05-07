import { useEffect } from 'react';
import { Button } from '@components/ui/button';
import { userManager } from './authConfig';
import { clearOidcClientState } from './oidcStorageCleanup';

const LOGOUT_IN_PROGRESS_KEY = 'auth.logout_in_progress';

export function LoggedOutPage() {
  useEffect(() => {
    clearOidcClientState();
    sessionStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
    void userManager.removeUser();
  }, []);

  const handleLogin = async () => {
    clearOidcClientState();
    await userManager.signinRedirect();
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: 'linear-gradient(180deg, #f4efe5 0%, #fbf8f2 100%)',
      }}
    >
      <section
        style={{
          width: 'min(480px, 100%)',
          padding: '32px',
          borderRadius: '24px',
          background: '#fffaf2',
          border: '1px solid rgba(65, 46, 18, 0.12)',
          boxShadow: '0 24px 80px rgba(65, 46, 18, 0.12)',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, color: '#7b6644', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Sessao encerrada
        </p>
        <h1 style={{ margin: '12px 0 8px', fontSize: '32px', lineHeight: 1.1, color: '#2e2416' }}>
          Logout concluido
        </h1>
        <p style={{ margin: '0 0 24px', color: '#5e513c', fontSize: '16px' }}>
          A sessao no mini-ECAD foi encerrada. Quando quiser voltar, inicie um novo login.
        </p>
        <Button variant="primary" type="button" onClick={() => void handleLogin()}>
          Entrar novamente
        </Button>
      </section>
    </main>
  );
}
