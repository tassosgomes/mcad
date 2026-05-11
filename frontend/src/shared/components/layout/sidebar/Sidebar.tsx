import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Database, Search, Banknote, Split, ChevronDown, ScrollText, ShieldCheck } from 'lucide-react';
import { useAuth } from '@shared/auth';
import styles from './Sidebar.module.css';

const navigation = [
  {
    label: 'Cadastro',
    icon: Database,
    basePath: '/cadastro',
    requiredRoles: ['analista-cadastro', 'consultor'],
    children: [
      { label: 'Associações', path: '/cadastro/associacoes' },
      { label: 'Titulares', path: '/cadastro/titulares' },
      { label: 'Obras', path: '/cadastro/obras' },
      { label: 'Fonogramas', path: '/cadastro/fonogramas' },
    ],
  },
  // Fases futuras (desabilitados):
  { 
    label: 'Identificação', 
    icon: Search, 
    basePath: '/identificacao', 
    disabled: false,
    requiredRoles: ['analista-identificacao', 'consultor-identificacao'],
    children: [
      { label: 'Captações', path: '/identificacao/captacoes' },
      { label: 'Pendentes', path: '/identificacao/pendentes' },
    ]
  },
  { 
    label: 'Arrecadação', 
    icon: Banknote, 
    basePath: '/arrecadacao', 
    disabled: false, 
    requiredRoles: ['analista-arrecadacao', 'consultor-arrecadacao'],
    children: [
      { label: 'Usuários de Música', path: '/arrecadacao/usuarios-musica' },
      { label: 'Licenças', path: '/arrecadacao/licencas' },
      { label: 'Pagamentos', path: '/arrecadacao/pagamentos' },
      { label: 'UDA', path: '/arrecadacao/uda' },
    ],
  },
  {
    label: 'Distribuição',
    icon: Split,
    basePath: '/distribuicao',
    disabled: false,
    requiredRoles: ['analista-distribuicao', 'consultor-distribuicao'],
    children: [
      { label: 'Rubricas', path: '/distribuicao/rubricas' },
    ],
  },
  {
    label: 'Auditoria',
    icon: ScrollText,
    basePath: '/auditoria',
    disabled: false,
    requiredRoles: [
      'analista-cadastro',
      'analista-identificacao',
      'analista-arrecadacao',
      'analista-distribuicao',
    ],
    children: [
      { label: 'Eventos por entidade', path: '/auditoria/eventos' },
      { label: 'Acessos a telas', path: '/auditoria/acessos' },
      { label: 'Relatórios', path: '/auditoria/relatorios' },
    ],
  },
  {
    label: 'Autorização',
    icon: ShieldCheck,
    basePath: '/autorizacao',
    disabled: false,
    requiredRoles: [
      'analista-cadastro',
      'analista-identificacao',
      'analista-arrecadacao',
      'analista-distribuicao',
    ],
    children: [
      { label: 'Permissões', path: '/autorizacao/permissoes' },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { hasRole } = useAuth();

  // Always open first section for now
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Cadastro': true,
    'Identificação': true,
    'Arrecadação': true,
    'Distribuição': true,
    'Auditoria': true,
    'Autorização': true,
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
            
            // Check visibility
            const isVisible = group.requiredRoles.length === 0 || group.requiredRoles.some(role => hasRole(role));
            if (!isVisible) return null;
            
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
