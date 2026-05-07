import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@components/layout/main-layout';
import { Loading } from '@components/ui/loading';
import { CallbackPage, LoggedOutPage, ProtectedRoute, RequireRole, SilentCallbackPage } from '@shared/auth';
import { useAuth } from '@shared/auth/useAuth';
import { getDefaultAuthorizedPath } from '@shared/auth/authorizedRoutes';

const CadastroRoutes = lazy(() => import('@features/cadastro'));
const IdentificacaoRoutes = lazy(() => import('@features/identificacao'));
const ArrecadacaoRoutes = lazy(() => import('@features/arrecadacao'));
const DistribuicaoRoutes = lazy(() => import('@features/distribuicao'));

function HomeRedirect() {
  const { roles } = useAuth();

  return <Navigate to={getDefaultAuthorizedPath(roles)} replace />;
}

export const router = createBrowserRouter([
  {
    path: '/callback',
    element: <CallbackPage />,
  },
  {
    path: '/logout',
    element: <LoggedOutPage />,
  },
  {
    path: '/silent-callback',
    element: <SilentCallbackPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
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
    ],
  },
]);
