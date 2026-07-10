import { apiGet, apiPost } from '@services/apiClient';
import type {
  TitularResumoResponse,
  CadastroRepertorioResponse,
  RegistrarRepertorioCommand,
  ProblemDetailsWithCode,
} from '../types/repertorio';

export function isIswcIndisponivel(error: unknown): boolean {
  const problem = error as ProblemDetailsWithCode;
  return problem?.status === 502 && problem?.code === 'ISWC_INDISPONIVEL';
}

export async function buscarTitularPorDocumento(
  documento: string,
): Promise<TitularResumoResponse | null> {
  return apiGet<TitularResumoResponse | null>(
    `/repertorios/titulares?documento=${encodeURIComponent(documento)}`,
  );
}

export async function registrarRepertorio(
  command: RegistrarRepertorioCommand,
): Promise<CadastroRepertorioResponse> {
  return apiPost<CadastroRepertorioResponse>('/repertorios', command);
}

export async function registrarRepertorioPendente(
  command: RegistrarRepertorioCommand,
): Promise<CadastroRepertorioResponse> {
  return apiPost<CadastroRepertorioResponse>('/repertorios/pendentes', command);
}
