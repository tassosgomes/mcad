import { lazy, Suspense } from 'react';
import { createBrowserRouter, isRouteErrorResponse, Navigate, useRouteError } from 'react-router-dom';
import { MainLayout } from '@components/layout/main-layout';
import { Loading } from '@components/ui/loading';
import { CallbackPage, LoggedOutPage, ProtectedRoute, RequirePermission, SilentCallbackPage } from '@shared/auth';
import { useAuth } from '@shared/auth/useAuth';
import { getDefaultAuthorizedPath } from '@shared/auth/authorizedRoutes';

const CadastroRoutes = lazy(() => import('@features/cadastro'));
const IdentificacaoRoutes = lazy(() => import('@features/identificacao'));
const ArrecadacaoRoutes = lazy(() => import('@features/arrecadacao'));
const DistribuicaoRoutes = lazy(() => import('@features/distribuicao'));
const AuditoriaRoutes = lazy(() => import('@features/auditoria'));
const AuthzRoutes = lazy(() => import('@features/authz'));
const CopilotoPage = lazy(() =>
  import('@features/copiloto').then((module) => ({ default: module.CopilotoPage })),
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
];

/**
 * Copiloto está disponível para qualquer usuário que tenha acesso (mesmo de
 * leitura) a um dos domínios.
 *
 * TODO B3: definir permissão copiloto dedicada quando o catálogo de copiloto
 * estiver formalizado.
 */
const COPILOTO_PERMISSIONS = [
  'cadastro:default:associacao:listar',
  'identificacao:default:captacao:listar',
  'arrecadacao:default:cliente:listar',
  // TODO: aguardando catálogo real da distribuicao-api
  'distribuicao:default:roteiro:listar',
];

function HomeRedirect() {
  const { roles } = useAuth();

  return <Navigate to={getDefaultAuthorizedPath(roles)} replace />;
}

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
      { index: true, element: <HomeRedirect /> },
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
        // TODO: aguardando catálogo real da distribuicao-api. Quando o
        // serviço expuser permissões, substituir pelo equivalente de listar
        // roteiros/processos.
        element: (
          <RequirePermission permission="distribuicao:default:roteiro:listar">
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
          <RequirePermission anyOf={AUDIT_PERMISSIONS}>
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
