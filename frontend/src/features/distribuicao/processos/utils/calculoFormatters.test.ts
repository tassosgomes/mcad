import { describe, expect, it } from 'vitest';
import {
  formatCategoria,
  formatCurrency,
  formatDateTime,
  formatDecimal,
  formatMotivoRetencao,
  formatPercentage,
  formatStatusCredito,
  formatStatusLiberacao,
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
    expect(formatStatusProcesso('FINALIZADO')).toBe('Finalizado');
    expect(formatCategoria('AUTORAL')).toBe('Autoral');
    expect(formatSubcategoria(null)).toBe('-');
    expect(formatSubcategoria('MUSICO')).toBe('Músico');
    expect(formatStatusCredito('CALCULADO')).toBe('Calculado');
    expect(formatStatusCredito('RETIDO')).toBe('Retido');
    expect(formatStatusCredito('LIBERADO')).toBe('Liberado');
    expect(formatStatusLiberacao('PREVISTA')).toBe('Previsto');
    expect(formatStatusLiberacao('EFETIVADA')).toBe('Liberado');
    expect(formatMotivoRetencao(null)).toBe('-');
    expect(formatMotivoRetencao('TITULAR_SEM_ASSOCIACAO')).toBe('Titular sem associação');
  });
});
