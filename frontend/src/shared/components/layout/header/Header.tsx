import { LogOut, Menu } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { useAuth } from '@shared/auth';
import { useEffectiveProfile } from '@shared/auth/meApi';
import styles from './Header.module.css';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { isAuthenticated, logout } = useAuth();
  const profileQuery = useEffectiveProfile();
  const profile = profileQuery.data;
  const userName = profile?.name ?? profile?.email ?? profile?.subjectId ?? 'Usuário autenticado';
  const roleLabel = profile?.primaryRole ?? 'Perfil efetivo';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuButton} onClick={onMenuClick} aria-label="Menu" type="button">
          <Menu size={20} />
        </button>
        <div className={styles.brand}>
          <h1 className={styles.title}>mini-ECAD</h1>
          <span className={styles.subtitle}>Sistema de Gestão de Direitos Autorais</span>
        </div>
      </div>

      {isAuthenticated && (
        <div className={styles.right}>
          <span className={styles.userName}>{userName}</span>
          <Badge variant="secondary">{roleLabel}</Badge>
          <button className={styles.logoutButton} onClick={() => void logout()} aria-label="Sair" type="button">
            <LogOut size={18} />
          </button>
        </div>
      )}
    </header>
  );
}
