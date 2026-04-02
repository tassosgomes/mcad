import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@components/layout/main-layout';
import { Loading } from '@components/ui/loading';
import { CallbackPage, LoggedOutPage, ProtectedRoute, SilentCallbackPage } from '@shared/auth';

const CadastroRoutes = lazy(() => import('@features/cadastro'));

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
      { index: true, element: <Navigate to="/cadastro/associacoes" replace /> },
      { 
        path: 'cadastro/*', 
        element: (
          <Suspense fallback={<Loading />}>
            <CadastroRoutes />
          </Suspense>
        ) 
      },
    ],
  },
]);
