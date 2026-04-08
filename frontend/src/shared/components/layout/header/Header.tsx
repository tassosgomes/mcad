
import styles from './Header.module.css';
import { LogOut, Menu } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { useAuth } from '@shared/auth';

interface HeaderProps {
  onMenuClick?: () => void;
}

const ROLE_LABELS: Array<[string, string]> = [
  ['analista-arrecadacao', 'Analista de Arrecadação'],
  ['analista-identificacao', 'Analista de Identificação'],
  ['analista-cadastro', 'Analista de Cadastro'],
  ['consultor-arrecadacao', 'Consultor de Arrecadação'],
  ['consultor-identificacao', 'Consultor de Identificação'],
  ['consultor', 'Consultor'],
];

function resolveRoleLabel(roles: string[]): string {
  const matchedRole = ROLE_LABELS.find(([role]) => roles.includes(role));
  return matchedRole?.[1] ?? 'Usuário autenticado';
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, roles, logout } = useAuth();
  const userName = user?.profile.name ?? user?.profile.preferred_username ?? user?.profile.sub ?? 'Usuário';
  const roleLabel = resolveRoleLabel(roles);

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

      {user && (
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
