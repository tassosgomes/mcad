import { portalGet } from '../../shared/api/portalClient';
import type { MinhaObra, MeuFonograma, RepertorioFiltros } from '../types/repertorio';

export function getMinhasObras(filtros: RepertorioFiltros): Promise<MinhaObra[]> {
  const params = new URLSearchParams();
  if (filtros.titulo) params.set('titulo', filtros.titulo);
  if (filtros.sort) params.set('sort', filtros.sort);
  return portalGet<MinhaObra[]>(`/minhas-obras?${params}`);
}

export function getMeusFonogramas(filtros: RepertorioFiltros): Promise<MeuFonograma[]> {
  const params = new URLSearchParams();
  if (filtros.titulo) params.set('titulo', filtros.titulo);
  if (filtros.sort) params.set('sort', filtros.sort);
  return portalGet<MeuFonograma[]>(`/meus-fonogramas?${params}`);
}
