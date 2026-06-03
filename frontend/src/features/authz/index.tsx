import { Navigate, Route, Routes } from 'react-router-dom';
import { RequirePermission } from '@shared/auth/RequirePermission';
import { usePermissions } from '@shared/authz';
import { MeuDominioPage } from '@features/autorizacao/meu-dominio/MeuDominioPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { RolesPage } from './pages/RolesPage';

const AUTHZ_ADMIN_PERMISSIONS = [
  'authz:admin:role:visualizar',
  'authz:admin:permission:visualizar',
  'authz:admin:user:visualizar',
  'authz:admin:user-role:visualizar',
  'authz:admin:session:visualizar',
  'authz:admin:audit:visualizar',
];

const MEU_DOMINIO_PERMISSIONS = [
  'acessos:default:papel:listar',
  'acessos:cadastro:papel:visualizar',
  'acessos:identificacao:papel:visualizar',
  'acessos:arrecadacao:papel:visualizar',
  'acessos:distribuicao:papel:visualizar',
];

function AutorizacaoIndex() {
  const { hasAny, can } = usePermissions();

  if (can('authz:admin:permission:visualizar')) {
    return <Navigate to="permissoes" replace />;
  }

  if (can('authz:admin:role:visualizar') || can('acessos:default:papel:listar')) {
    return <Navigate to="papeis" replace />;
  }

  if (hasAny(MEU_DOMINIO_PERMISSIONS)) {
    return <Navigate to="meu-dominio" replace />;
  }

  return <Navigate to="/" replace />;
}

export default function AuthzRoutes() {
  return (
    <Routes>
      <Route index element={<AutorizacaoIndex />} />
      <Route
        path="permissoes"
        element={(
          <RequirePermission anyOf={AUTHZ_ADMIN_PERMISSIONS}>
            <PermissionsPage />
          </RequirePermission>
        )}
      />
      <Route
        path="papeis"
        element={(
          <RequirePermission anyOf={[...AUTHZ_ADMIN_PERMISSIONS, 'acessos:default:papel:listar']}>
            <RolesPage />
          </RequirePermission>
        )}
      />
      {/* Legacy path: kept so old bookmarks land on the unified Papéis & Acessos screen. */}
      <Route path="atribuicoes" element={<Navigate to="../papeis" replace />} />
      <Route
        path="meu-dominio"
        element={(
          <RequirePermission anyOf={MEU_DOMINIO_PERMISSIONS}>
            <MeuDominioPage />
          </RequirePermission>
        )}
      />
    </Routes>
  );
}
