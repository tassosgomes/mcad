import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CalculoProcessoResponse } from '../types/calculo';
import { CalculoSummary } from './CalculoSummary';

const calculo: CalculoProcessoResponse = {
  processoId: 'processo-1',
  status: 'CALCULADO',
  rubricaSigla: 'TV',
  periodo: '2026-05',
  resumo: {
    verbaLiquida: '1000.00',
    totalExecucoes: 25,
    totalPontos: '40.000000',
    totalObras: 3,
    totalCreditos: 8,
    valorTotalCalculado: '987.65',
    calculadoEm: '2026-05-07T18:10:00Z',
  },
  creditos: {
    items: [],
    metadata: {
      page: 0,
      size: 20,
      total: 0,
      totalPages: 0,
    },
  },
};

describe('CalculoSummary', () => {
  it('formats verba liquida and calculated totals consistently', () => {
    render(<CalculoSummary calculo={calculo} />);

    expect(screen.getByRole('heading', { name: /resumo do cálculo/i })).toBeInTheDocument();
    expect(screen.getByText('TV')).toBeInTheDocument();
    expect(screen.getByText('2026-05')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 987,65')).toBeInTheDocument();
    expect(screen.getByText('40,00')).toBeInTheDocument();
  });
});
