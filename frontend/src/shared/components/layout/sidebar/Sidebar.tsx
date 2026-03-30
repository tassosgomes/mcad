import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Database, Search, Banknote, Split, ChevronDown } from 'lucide-react';
import styles from './Sidebar.module.css';

const navigation = [
  {
    label: 'Cadastro',
    icon: Database,
    basePath: '/cadastro',
    children: [
      { label: 'Associações', path: '/cadastro/associacoes' },
      { label: 'Titulares', path: '/cadastro/titulares' },
    ],
  },
  // Fases futuras (desabilitados):
  { label: 'Identificação', icon: Search, basePath: '/identificacao', disabled: true },
  { label: 'Arrecadação', icon: Banknote, basePath: '/arrecadacao', disabled: true },
  { label: 'Distribuição', icon: Split, basePath: '/distribuicao', disabled: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  // Always open first section for now
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Cadastro': true
  });

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  return (
    <>
      <div 
        className={`${styles.overlay} ${isOpen ? styles.open : ''}`} 
        onClick={onClose} 
        aria-hidden="true" 
      />
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <nav className={styles.nav}>
          {navigation.map((group) => {
            const Icon = group.icon;
            const isGroupOpen = openSections[group.label];
            
            return (
              <div key={group.label} className={styles.group}>
                <button 
                  className={`${styles.groupButton} ${group.disabled ? styles.disabled : ''}`} 
                  onClick={() => !group.disabled && toggleSection(group.label)}
                  disabled={group.disabled}
                  type="button"
                >
                  <div className={styles.groupHeader}>
                    <Icon size={18} className={styles.groupIcon} />
                    <span className={styles.groupLabel}>{group.label}</span>
                  </div>
                  {!group.disabled && group.children && (
                    <ChevronDown size={16} className={`${styles.chevron} ${isGroupOpen ? styles.open : ''}`} />
                  )}
                </button>
                
                {!group.disabled && group.children && isGroupOpen && (
                  <div className={styles.links}>
                    {group.children.map(child => (
                      <NavLink 
                        key={child.path} 
                        to={child.path}
                        className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                        onClick={() => {
                          if (window.innerWidth < 768 && onClose) {
                            onClose();
                          }
                        }}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
