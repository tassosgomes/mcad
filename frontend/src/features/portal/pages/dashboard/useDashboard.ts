import { useQuery } from '@tanstack/react-query';
import { portalGet } from '../../shared/api/portalClient';

interface DashboardData {
  minhasObras: number;
  meusFonogramas: number;
  ocorrenciasAbertas: number;
  solicitacoesPendentes: number;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['portal', 'dashboard'],
    queryFn: async () => {
      const [obras, fonogramas, ocorrencias, solicitacoes] = await Promise.allSettled([
        portalGet<unknown[]>('/minhas-obras'),
        portalGet<unknown[]>('/meus-fonogramas'),
        portalGet<unknown[]>('/ocorrencias'),
        portalGet<unknown[]>('/solicitacoes-alteracao'),
      ]);

      return {
        minhasObras: obras.status === 'fulfilled' ? obras.value.length : 0,
        meusFonogramas: fonogramas.status === 'fulfilled' ? fonogramas.value.length : 0,
        ocorrenciasAbertas:
          ocorrencias.status === 'fulfilled'
            ? (ocorrencias.value as Array<{ status: string }>).filter(
                (o) => o.status === 'ABERTA' || o.status === 'EM_ANALISE',
              ).length
            : 0,
        solicitacoesPendentes:
          solicitacoes.status === 'fulfilled'
            ? (solicitacoes.value as Array<{ status: string }>).filter(
                (s) => s.status === 'SOLICITADA',
              ).length
            : 0,
      } satisfies DashboardData;
    },
  });
}
