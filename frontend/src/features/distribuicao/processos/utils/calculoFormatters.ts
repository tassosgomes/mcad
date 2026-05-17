import type {
  CategoriaCredito,
  MotivoRetencao,
  StatusCredito,
  StatusLiberacaoCredito,
  StatusProcesso,
  SubcategoriaConexa,
} from '../types/calculo';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const percentageFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export function formatCurrency(value: string | number | null | undefined): string {
  const numericValue = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function formatDecimal(value: string | number | null | undefined): string {
  const numericValue = Number(value ?? 0);
  return decimalFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function formatPercentage(value: string | number | null | undefined): string {
  const numericValue = Number(value ?? 0);
  return `${percentageFormatter.format(Number.isFinite(numericValue) ? numericValue : 0)}%`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Aguardando cálculo';
  }

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatStatusProcesso(status: StatusProcesso): string {
  const labels: Record<StatusProcesso, string> = {
    CRIADO: 'Criado',
    CALCULADO: 'Calculado',
    APROVADO: 'Aprovado',
    FINALIZADO: 'Finalizado',
    CANCELADO: 'Cancelado',
  };

  return labels[status] ?? status;
}

export function formatCategoria(categoria: CategoriaCredito): string {
  const labels: Record<CategoriaCredito, string> = {
    AUTORAL: 'Autoral',
    CONEXO: 'Conexo',
  };

  return labels[categoria] ?? categoria;
}

export function formatSubcategoria(subcategoria: SubcategoriaConexa | null): string {
  if (!subcategoria) {
    return '-';
  }

  const labels: Record<SubcategoriaConexa, string> = {
    INTERPRETE: 'Intérprete',
    PRODUTOR: 'Produtor',
    MUSICO: 'Músico',
  };

  return labels[subcategoria] ?? subcategoria;
}

export function formatStatusCredito(status: StatusCredito): string {
  const labels: Record<StatusCredito, string> = {
    CALCULADO: 'Calculado',
    RETIDO: 'Retido',
    LIBERADO: 'Liberado',
  };

  return labels[status] ?? status;
}

export function formatStatusLiberacao(status: StatusLiberacaoCredito): string {
  const labels: Record<StatusLiberacaoCredito, string> = {
    PREVISTA: 'Previsto',
    EFETIVADA: 'Liberado',
    CANCELADA: 'Cancelado',
  };

  return labels[status] ?? status;
}

export function formatMotivoRetencao(motivo: MotivoRetencao | null): string {
  if (!motivo) {
    return '-';
  }

  const labels: Record<MotivoRetencao, string> = {
    OBRA_PENDENTE: 'Obra pendente',
    OBRA_BLOQUEADA: 'Obra bloqueada',
    TITULAR_SEM_ASSOCIACAO: 'Titular sem associação',
  };

  return labels[motivo] ?? motivo;
}
