import { useState } from 'react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import type { LucideProps } from 'lucide-react';
import { Database, Search, Banknote, Split, ChevronDown, ScrollText, ShieldCheck, Home } from 'lucide-react';
import { AUDITORIA_PERMISSIONS, AUDITORIA_ROUTE_PERMISSIONS } from '@shared/auth/auditoriaPermissions';
import { usePermissions } from '@shared/authz';
import styles from './Sidebar.module.css';

interface SidebarChild {
  label: string;
  path: string;
  /** optional: child is hidden unless the user has this permission */
  requiredPermission?: string;
  /** anyOf-semantics: child is visible if the subject has at least one permission. */
  requiredPermissions?: string[];
  /** when true, NavLink só fica ativa em correspondência exata do path. */
  end?: boolean;
}

interface SidebarGroup {
  label: string;
  icon: ComponentType<LucideProps>;
  basePath: string;
  disabled?: boolean;
  /** anyOf-semantics: visible if the subject has at least one permission. */
  requiredPermissions: string[];
  children: SidebarChild[];
}

/**
 * Permissões que governam quais grupos do menu são visíveis. A regra é "anyOf":
 * o usuário precisa ter ao menos uma das permissões listadas para enxergar o
 * grupo. Espelha o critério usado em `routes.tsx`.
 */
const navigation: SidebarGroup[] = [
  {
    label: 'Cadastro',
    icon: Database,
    basePath: '/cadastro',
    requiredPermissions: ['cadastro:default:associacao:listar'],
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
    requiredPermissions: ['identificacao:default:captacao:listar'],
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
    requiredPermissions: ['arrecadacao:default:cliente:listar'],
    children: [
      { label: 'Usuários de Música', path: '/arrecadacao/usuarios-musica' },
      { label: 'Licenças', path: '/arrecadacao/licencas' },
      { label: 'Pagamentos', path: '/arrecadacao/pagamentos' },
      { label: 'Verbas', path: '/arrecadacao/verbas' },
      { label: 'UDA', path: '/arrecadacao/uda' },
    ],
  },
  {
    label: 'Distribuição',
    icon: Split,
    basePath: '/distribuicao',
    disabled: false,
    requiredPermissions: [
      'distribuicao:default:rubrica:listar',
      'distribuicao:default:processo:listar',
    ],
    children: [
      {
        label: 'Rubricas',
        path: '/distribuicao/rubricas',
        requiredPermission: 'distribuicao:default:rubrica:listar',
      },
      {
        label: 'Processos',
        path: '/distribuicao/processos',
        requiredPermission: 'distribuicao:default:processo:listar',
      },
    ],
  },
  {
    label: 'Auditoria',
    icon: ScrollText,
    basePath: '/auditoria',
    disabled: false,
    requiredPermissions: [...AUDITORIA_ROUTE_PERMISSIONS],
    children: [
      {
        label: 'Início',
        path: '/auditoria',
        end: true,
        requiredPermissions: [...AUDITORIA_ROUTE_PERMISSIONS],
      },
      {
        label: 'Histórico de alterações',
        path: '/auditoria/eventos',
        requiredPermission: AUDITORIA_PERMISSIONS.eventList,
      },
      {
        label: 'Quem acessou o quê',
        path: '/auditoria/acessos',
        requiredPermission: AUDITORIA_PERMISSIONS.eventList,
      },
      {
        label: 'Relatórios em PDF',
        path: '/auditoria/relatorios',
        requiredPermission: AUDITORIA_PERMISSIONS.eventList,
      },
    ],
  },
  {
    label: 'Autorização',
    icon: ShieldCheck,
    basePath: '/autorizacao',
    disabled: false,
    // Administração da plataforma de autorização — visível para qualquer
    // usuário com permissão de leitura `authz:admin:*`.
    requiredPermissions: [
      'authz:admin:role:visualizar',
      'authz:admin:permission:visualizar',
      'authz:admin:user:visualizar',
      'authz:admin:user-role:visualizar',
      'authz:admin:session:visualizar',
      'authz:admin:audit:visualizar',
      'acessos:default:papel:listar',
      'acessos:default:papel:atribuir',
      'acessos:cadastro:papel:visualizar',
      'acessos:identificacao:papel:visualizar',
      'acessos:arrecadacao:papel:visualizar',
      'acessos:distribuicao:papel:visualizar',
    ],
    children: [
      {
        label: 'Permissões',
        path: '/autorizacao/permissoes',
        requiredPermission: 'authz:admin:permission:visualizar',
      },
      {
        label: 'Papéis & Acessos',
        path: '/autorizacao/papeis',
        requiredPermissions: [
          'authz:admin:role:visualizar',
          'acessos:default:papel:listar',
        ],
      },
      {
        label: 'Meu Domínio',
        path: '/autorizacao/meu-dominio',
        requiredPermissions: [
          'acessos:default:papel:listar',
          'acessos:cadastro:papel:visualizar',
          'acessos:identificacao:papel:visualizar',
          'acessos:arrecadacao:papel:visualizar',
          'acessos:distribuicao:papel:visualizar',
        ],
      },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { hasAny, can, isLoading } = usePermissions();

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
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${styles.homeLink} ${isActive ? styles.activeHome : ''}`}
            onClick={() => {
              if (window.innerWidth < 768 && onClose) {
                onClose();
              }
            }}
          >
            <div className={styles.groupHeader}>
              <Home size={18} className={styles.groupIcon} />
              <span className={styles.groupLabel}>Início</span>
            </div>
          </NavLink>
          {navigation.map((group) => {
            const Icon = group.icon;
            const isGroupOpen = openSections[group.label];

            // Visibility: hide while permissions are loading to avoid flashing
            // entries the user can't access. After loading, show only when
            // the subject has at least one of the required permissions.
            const required = group.requiredPermissions;
            const isVisible = !isLoading && (!required.length || hasAny(required));
            if (!isVisible) return null;

            // Filter children by per-item permission (if specified)
            const visibleChildren = group.children.filter(
              (child) =>
                (!child.requiredPermission || can(child.requiredPermission)) &&
                (!child.requiredPermissions || hasAny(child.requiredPermissions)),
            );

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

                {!group.disabled && visibleChildren.length > 0 && isGroupOpen && (
                  <div className={styles.links}>
                    {visibleChildren.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        end={child.end}
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
