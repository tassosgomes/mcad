export function formatBRL(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatUdas(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 6 });
}
