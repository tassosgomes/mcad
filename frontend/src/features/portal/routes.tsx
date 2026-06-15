import { lazy, Suspense } from 'react';
import { type RouteObject } from 'react-router-dom';
import { Loading } from '@components/ui/loading';
import { runtimeConfig } from '@/shared/config/runtimeConfig';
import { PortalAuthProvider } from './shared/auth/PortalAuthProvider';
import { PortalProtectedRoute } from './shared/auth/PortalProtectedRoute';
import { PortalLayout } from './shared/layout/PortalLayout';

const PortalLoginPage = lazy(() =>
  import('./pages/login/PortalLoginPage').then((m) => ({ default: m.PortalLoginPage })),
);
const AutoCadastroPage = lazy(() =>
  import('./pages/auto-cadastro/AutoCadastroPage').then((m) => ({ default: m.AutoCadastroPage })),
);
const PortalDashboardPage = lazy(() =>
  import('./pages/dashboard/PortalDashboardPage').then((m) => ({ default: m.PortalDashboardPage })),
);
const ContatoPage = lazy(() =>
  import('./contato').then((m) => ({ default: m.ContatoPage })),
);
const RepertorioPage = lazy(() =>
  import('./repertorio').then((m) => ({ default: m.RepertorioPage })),
);
const OcorrenciasPage = lazy(() =>
  import('./ocorrencias').then((m) => ({ default: m.OcorrenciasPage })),
);
const AbrirOcorrenciaPage = lazy(() =>
  import('./ocorrencias').then((m) => ({ default: m.AbrirOcorrenciaPage })),
);
const SolicitacoesPage = lazy(() =>
  import('./solicitacoes').then((m) => ({ default: m.SolicitacoesPage })),
);
const AbrirSolicitacaoPage = lazy(() =>
  import('./solicitacoes').then((m) => ({ default: m.AbrirSolicitacaoPage })),
);

function SuspenseFallback() {
  return <Loading />;
}

export const portalRoutes: RouteObject = {
  path: '/portal',
  children: [
    {
      path: 'login',
      element: (
        <Suspense fallback={<SuspenseFallback />}>
          <PortalLoginPage />
        </Suspense>
      ),
    },
    {
      path: 'auto-cadastro',
      element: (
        <Suspense fallback={<SuspenseFallback />}>
          <AutoCadastroPage />
        </Suspense>
      ),
    },
    {
      element: (
        <PortalAuthProvider portalApiBaseUrl={runtimeConfig.portalApiBaseUrl}>
          <PortalProtectedRoute>
            <PortalLayout />
          </PortalProtectedRoute>
        </PortalAuthProvider>
      ),
      children: [
        {
          index: true,
          element: (
            <Suspense fallback={<SuspenseFallback />}>
              <PortalDashboardPage />
            </Suspense>
          ),
        },
        {
          path: 'contato',
          element: (
            <Suspense fallback={<SuspenseFallback />}>
              <ContatoPage />
            </Suspense>
          ),
        },
        {
          path: 'repertorio',
          element: (
            <Suspense fallback={<SuspenseFallback />}>
              <RepertorioPage />
            </Suspense>
          ),
        },
        {
          path: 'ocorrencias',
          element: (
            <Suspense fallback={<SuspenseFallback />}>
              <OcorrenciasPage />
            </Suspense>
          ),
        },
        {
          path: 'ocorrencias/abrir',
          element: (
            <Suspense fallback={<SuspenseFallback />}>
              <AbrirOcorrenciaPage />
            </Suspense>
          ),
        },
        {
          path: 'solicitacoes',
          element: (
            <Suspense fallback={<SuspenseFallback />}>
              <SolicitacoesPage />
            </Suspense>
          ),
        },
        {
          path: 'solicitacoes/abrir',
          element: (
            <Suspense fallback={<SuspenseFallback />}>
              <AbrirSolicitacaoPage />
            </Suspense>
          ),
        },
      ],
    },
  ],
};
