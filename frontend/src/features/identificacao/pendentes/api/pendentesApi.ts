import { apiGetIden, apiPostIden } from '@/shared/services/apiIdentificacaoClient';
import type {
  ExecucaoPendente,
  ImpactoPendenteListResponse,
  PendenteListFilters,
  PendenteListResponse,
  ResolverLoteRequest,
  ResolverLoteResponse,
  ResolverPendenteRequest,
  ImpactoPendenteFilters,
} from '../types/pendente';

export const pendentesApi = {
  getPendentes: async (filters?: PendenteListFilters): Promise<PendenteListResponse> => {
    let url = '/pendentes';
    if (filters) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return apiGetIden<PendenteListResponse>(url);
  },

  getImpactoPendentes: async (filters?: ImpactoPendenteFilters): Promise<ImpactoPendenteListResponse> => {
    let url = '/pendentes/impacto';
    if (filters) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return apiGetIden<ImpactoPendenteListResponse>(url);
  },

  resolverPendente: async (id: string, data: ResolverPendenteRequest): Promise<ExecucaoPendente> => {
    return apiPostIden<ExecucaoPendente>(`/pendentes/${id}/resolver`, data);
  },

  resolverPendentesEmLote: async (data: ResolverLoteRequest): Promise<ResolverLoteResponse> => {
    return apiPostIden<ResolverLoteResponse>('/pendentes/resolver-lote', data);
  },
};

