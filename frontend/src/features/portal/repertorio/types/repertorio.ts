export interface MinhaObra {
  id: string;
  titulo: string;
  categoria: string | null;
  iswc: string | null;
  percentual: number;
}

export interface MeuFonograma {
  id: string;
  titulo: string;
  isrc: string | null;
  papel: string | null;
  percentual: number;
  obraId: string;
}

export interface RepertorioFiltros {
  titulo?: string;
  sort: string;
}
