import { lazy, Suspense } from 'react';
import { createBrowserRouter, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { MainLayout } from '@components/layout/main-layout';
import { Loading } from '@components/ui/loading';
import { CallbackPage, LoggedOutPage, ProtectedRoute, RequirePermission, SilentCallbackPage } from '@shared/auth';

const CadastroRoutes = lazy(() => import('@features/cadastro'));
const IdentificacaoRoutes = lazy(() => import('@features/identificacao'));
const ArrecadacaoRoutes = lazy(() => import('@features/arrecadacao'));
const DistribuicaoRoutes = lazy(() => import('@features/distribuicao'));
const AuditoriaRoutes = lazy(() => import('@features/auditoria'));
const AuthzRoutes = lazy(() => import('@features/authz'));
const CopilotoPage = lazy(() =>
  import('@features/copiloto').then((module) => ({ default: module.CopilotoPage })),
);
const DashboardPage = lazy(() =>
  import('@features/dashboard').then((module) => ({ default: module.DashboardPage })),
);

/**
 * Auditoria precisa abranger usuários de qualquer domínio. Como ainda não
 * existe uma permissão dedicada de auditoria, derivamos de permissões de
 * histórico/status nos catálogos de cadastro e identificação. Quando a
 * arrecadacao-api expuser histórico, incluir aqui.
 *
 * TODO B3: validar permissões de auditoria com o backend (catálogo definitivo
 * de auditoria ainda não existe).
 */
const AUDIT_PERMISSIONS = [
  'cadastro:default:status:visualizar-historico-obra',
  'cadastro:default:status:visualizar-historico-fonograma',
  'identificacao:default:captacao:listar',
  'arrecadacao:default:cliente:listar',
  // Inclui tambem visualizar-audit do dominio authz (eventos da plataforma
  // de autorizacao). Usuarios "admin de authz" precisam alcancar Auditoria.
  'authz:admin:audit:visualizar',
];

/**
 * Administração da plataforma de autorização (catálogo, papéis, atribuições,
 * sessões). Quem tem qualquer permissão de leitura `authz:admin:*` pode
 * acessar o módulo /autorizacao. Mantemos um `anyOf` largo porque o módulo
 * tem páginas heterogêneas (catálogo, papéis, sessões) — cada página fará
 * verificação granular interna.
 */
const AUTHZ_ADMIN_PERMISSIONS = [
  'authz:admin:role:visualizar',
  'authz:admin:permission:visualizar',
  'authz:admin:user:visualizar',
  'authz:admin:user-role:visualizar',
  'authz:admin:session:visualizar',
  'authz:admin:audit:visualizar',
];

const ACESSOS_PERMISSIONS = [
  'acessos:default:papel:listar',
  'acessos:default:papel:atribuir',
  'acessos:cadastro:papel:visualizar',
  'acessos:identificacao:papel:visualizar',
  'acessos:arrecadacao:papel:visualizar',
  'acessos:distribuicao:papel:visualizar',
];

/**
 * Copiloto está disponível para qualquer usuário que tenha acesso (mesmo de
 * leitura) a um dos domínios. Cada domínio aparece com sua permissão de
 * "listar primário": associações em Cadastro, captações em Identificação,
 * clientes em Arrecadação, rubricas em Distribuição. Catálogo dedicado de
 * copiloto fica para uma fase futura caso o time decida formalizar.
 */
const COPILOTO_PERMISSIONS = [
  'cadastro:default:associacao:listar',
  'identificacao:default:captacao:listar',
  'arrecadacao:default:cliente:listar',
  'distribuicao:default:rubrica:listar',
  'distribuicao:default:processo:listar',
];


function RouteErrorFallback() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : 'Ocorreu um erro inesperado ao carregar esta página.';

  return (
    <main style={{ padding: '32px' }}>
      <h1>Não foi possível carregar a página</h1>
      <p>{message}</p>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: '/callback',
    element: <CallbackPage />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/logout',
    element: <LoggedOutPage />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/silent-callback',
    element: <SilentCallbackPage />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loading />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'cadastro/*',
        element: (
          <RequirePermission permission="cadastro:default:associacao:listar">
            <Suspense fallback={<Loading />}>
              <CadastroRoutes />
            </Suspense>
          </RequirePermission>
        )
      },
      {
        path: 'identificacao/*',
        element: (
          <RequirePermission permission="identificacao:default:captacao:listar">
            <Suspense fallback={<Loading />}>
              <IdentificacaoRoutes />
            </Suspense>
          </RequirePermission>
        )
      },
      {
        path: 'arrecadacao/*',
        element: (
          <RequirePermission permission="arrecadacao:default:cliente:listar">
            <Suspense fallback={<Loading />}>
              <ArrecadacaoRoutes />
            </Suspense>
          </RequirePermission>
        )
      },
      {
        path: 'distribuicao/*',
        element: (
          <RequirePermission
            anyOf={[
              'distribuicao:default:rubrica:listar',
              'distribuicao:default:processo:listar',
            ]}
          >
            <Suspense fallback={<Loading />}>
              <DistribuicaoRoutes />
            </Suspense>
          </RequirePermission>
        )
      },
      {
        path: 'auditoria/*',
        element: (
          <RequirePermission anyOf={AUDIT_PERMISSIONS}>
            <Suspense fallback={<Loading />}>
              <AuditoriaRoutes />
            </Suspense>
          </RequirePermission>
        )
      },
      {
        path: 'autorizacao/*',
        element: (
          <RequirePermission anyOf={[...AUTHZ_ADMIN_PERMISSIONS, ...ACESSOS_PERMISSIONS]}>
            <Suspense fallback={<Loading />}>
              <AuthzRoutes />
            </Suspense>
          </RequirePermission>
        )
      },
      {
        path: 'copiloto',
        element: (
          <RequirePermission anyOf={COPILOTO_PERMISSIONS}>
            <Suspense fallback={<Loading />}>
              <CopilotoPage />
            </Suspense>
          </RequirePermission>
        )
      },
    ],
  },
]);
