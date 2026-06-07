export function formatBRL(value: string): string {
  const num = parseFloat(value);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercentualBR(value: string): string {
  const num = parseFloat(value);
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + '%';
}

export function formatNumberBR(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function formatDateTimeBR(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MOTIVO_LABEL: Record<string, string> = {
  OBRA_PENDENTE: 'Obra pendente',
  OBRA_BLOQUEADA: 'Obra bloqueada',
  TITULAR_SEM_ASSOCIACAO: 'Titular sem associacao',
};

export function getMotivoRetencaoLabel(motivo: string | null): string {
  if (!motivo) return '—';
  return MOTIVO_LABEL[motivo] || motivo;
}
