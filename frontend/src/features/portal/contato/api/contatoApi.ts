import { portalGet, portalPut } from '../../shared/api/portalClient';
import type { Contato, AtualizarContatoRequest } from '../types/contato';

export function getContato(): Promise<Contato> {
  return portalGet<Contato>('/me/contato');
}

export function atualizarContato(data: AtualizarContatoRequest): Promise<Contato> {
  return portalPut<Contato>('/me/contato', data);
}
