import { portalGet, portalPost } from '../../shared/api/portalClient';
import type { SolicitacaoAlteracao, CriarSolicitacaoRequest } from '../types/solicitacao';

export function getSolicitacoes(): Promise<SolicitacaoAlteracao[]> {
  return portalGet<SolicitacaoAlteracao[]>('/solicitacoes-alteracao');
}

export function criarSolicitacao(data: CriarSolicitacaoRequest): Promise<SolicitacaoAlteracao> {
  return portalPost<SolicitacaoAlteracao>('/solicitacoes-alteracao', data);
}
