import { NavLink } from 'react-router-dom';
import { FileText, Monitor, Rows3 } from 'lucide-react';
import styles from '../pages/AuditPage.module.css';

export function AuditTabs() {
  return (
    <nav className={styles.tabs} aria-label="Navegação de auditoria">
      <NavLink
        to="/auditoria/eventos"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.activeTab : ''}`}
      >
        <Rows3 size={16} />
        Eventos por entidade
      </NavLink>
      <NavLink
        to="/auditoria/acessos"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.activeTab : ''}`}
      >
        <Monitor size={16} />
        Acessos a telas
      </NavLink>
      <NavLink
        to="/auditoria/relatorios"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.activeTab : ''}`}
      >
        <FileText size={16} />
        Relatórios
      </NavLink>
    </nav>
  );
}
