import { lazy, Suspense } from 'react';
import { createBrowserRouter, isRouteErrorResponse, Navigate, useRouteError } from 'react-router-dom';
import { MainLayout } from '@components/layout/main-layout';
import { Loading } from '@components/ui/loading';
import { CallbackPage, LoggedOutPage, ProtectedRoute, RequireRole, SilentCallbackPage } from '@shared/auth';
import { useAuth } from '@shared/auth/useAuth';
import { getDefaultAuthorizedPath } from '@shared/auth/authorizedRoutes';

const CadastroRoutes = lazy(() => import('@features/cadastro'));
const IdentificacaoRoutes = lazy(() => import('@features/identificacao'));
const ArrecadacaoRoutes = lazy(() => import('@features/arrecadacao'));
const DistribuicaoRoutes = lazy(() => import('@features/distribuicao'));
const AuditoriaRoutes = lazy(() => import('@features/auditoria'));
const AuthzRoutes = lazy(() => import('@features/authz'));

const AUDIT_ROLES = [
  'analista-cadastro',
  'analista-identificacao',
  'analista-arrecadacao',
  'analista-distribuicao',
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
          <RequireRole roles={['analista-cadastro', 'consultor']}>
            <Suspense fallback={<Loading />}>
              <CadastroRoutes />
            </Suspense>
          </RequireRole>
        ) 
      },
      { 
        path: 'identificacao/*', 
        element: (
          <RequireRole roles={['analista-identificacao', 'consultor-identificacao']}>
            <Suspense fallback={<Loading />}>
              <IdentificacaoRoutes />
            </Suspense>
          </RequireRole>
        ) 
      },
      { 
        path: 'arrecadacao/*', 
        element: (
          <RequireRole roles={['analista-arrecadacao', 'consultor-arrecadacao']}>
            <Suspense fallback={<Loading />}>
              <ArrecadacaoRoutes />
            </Suspense>
          </RequireRole>
        ) 
      },
      {
        path: 'distribuicao/*',
        element: (
          <RequireRole roles={['analista-distribuicao', 'consultor-distribuicao']}>
            <Suspense fallback={<Loading />}>
              <DistribuicaoRoutes />
            </Suspense>
          </RequireRole>
        )
      },
      {
        path: 'auditoria/*',
        element: (
          <RequireRole roles={AUDIT_ROLES}>
            <Suspense fallback={<Loading />}>
              <AuditoriaRoutes />
            </Suspense>
          </RequireRole>
        )
      },
      {
        path: 'autorizacao/*',
        element: (
          <RequireRole roles={AUDIT_ROLES}>
            <Suspense fallback={<Loading />}>
              <AuthzRoutes />
            </Suspense>
          </RequireRole>
        )
      },
    ],
  },
]);
