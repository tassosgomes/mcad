
import styles from './Header.module.css';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
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
    </header>
  );
}
