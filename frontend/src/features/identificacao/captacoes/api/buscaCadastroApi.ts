import { apiGet, apiPost } from '@shared/services/apiClient';
import {
  BuscaCadastroResponse,
  CriarFonogramaPendenteRequest,
  CriarFonogramaPendenteResponse,
  CriarObraPendenteRequest,
  CriarObraPendenteResponse,
} from '../types/execucao';

export async function buscarCadastro(
  queryParam: string,
  tipo?: string,
  size: number = 20
): Promise<BuscaCadastroResponse> {
  const urlParams = new URLSearchParams({
    q: queryParam,
    size: size.toString(),
  });
  if (tipo) {
    urlParams.append('tipo', tipo);
  }

  return apiGet<BuscaCadastroResponse>(`/busca?${urlParams.toString()}`);
}

export async function criarObraPendente(
  data: CriarObraPendenteRequest
): Promise<CriarObraPendenteResponse> {
  return apiPost<CriarObraPendenteResponse>('/obras/pendentes', data);
}

export async function criarFonogramaPendente(
  data: CriarFonogramaPendenteRequest
): Promise<CriarFonogramaPendenteResponse> {
  return apiPost<CriarFonogramaPendenteResponse>('/fonogramas/pendentes', data);
}
