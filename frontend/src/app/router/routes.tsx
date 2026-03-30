import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@components/layout/main-layout';
import { Loading } from '@components/ui/loading';

const CadastroRoutes = lazy(() => import('@features/cadastro'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
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
