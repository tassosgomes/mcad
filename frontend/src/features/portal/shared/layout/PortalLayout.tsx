import { Outlet, useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../auth/usePortalAuth';
import styles from './PortalLayout.module.css';

export function PortalLayout() {
  const { titular, logout } = usePortalAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/portal/login', { replace: true });
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brand}>MCAD — Portal do Titular</span>
        </div>
        <div className={styles.headerRight}>
          {titular && <span className={styles.userName}>{titular.nome}</span>}
          <button className={styles.logoutButton} onClick={handleLogout} type="button">
            Sair
          </button>
        </div>
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
