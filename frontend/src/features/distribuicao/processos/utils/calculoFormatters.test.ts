import { describe, expect, it } from 'vitest';
import {
  formatCategoria,
  formatCurrency,
  formatDateTime,
  formatDecimal,
  formatPercentage,
  formatStatusCredito,
  formatStatusProcesso,
  formatSubcategoria,
} from './calculoFormatters';

describe('calculoFormatters', () => {
  it('formats empty and invalid numeric values with safe defaults', () => {
    expect(formatCurrency(null).replace(/\s/u, ' ')).toBe('R$ 0,00');
    expect(formatCurrency('not-a-number').replace(/\s/u, ' ')).toBe('R$ 0,00');
    expect(formatDecimal(undefined)).toBe('0,00');
    expect(formatPercentage(undefined)).toBe('0,00%');
  });

  it('formats date and enum labels', () => {
    expect(formatDateTime(null)).toBe('Aguardando cálculo');
    expect(formatStatusProcesso('CRIADO')).toBe('Criado');
    expect(formatCategoria('AUTORAL')).toBe('Autoral');
    expect(formatSubcategoria(null)).toBe('-');
    expect(formatSubcategoria('MUSICO')).toBe('Músico');
    expect(formatStatusCredito('CALCULADO')).toBe('Calculado');
  });
});
