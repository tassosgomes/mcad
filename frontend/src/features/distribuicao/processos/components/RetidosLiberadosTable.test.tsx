import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RetidoLiberadoItem } from '../types/calculo';
import { RetidosLiberadosTable } from './RetidosLiberadosTable';

const items: RetidoLiberadoItem[] = [
  {
    liberacaoId: 'liberacao-1',
    creditoId: 'credito-1',
    processoOrigemId: 'processo-origem',
    processoLiberacaoId: 'processo-liberacao',
    periodoOrigem: '2026-03',
    status: 'PREVISTA',
    titularId: '11111111-1111-1111-1111-111111111111',
    titularNome: 'Maria Compositora',
    obraId: '22222222-2222-2222-2222-222222222222',
    obraTitulo: 'Meu Bem Querer',
    fonogramaId: null,
    categoria: 'AUTORAL',
    subcategoriaConexa: null,
    valorLiberado: '400.00',
    motivoRetencaoOriginal: 'TITULAR_SEM_ASSOCIACAO',
    retidoEm: '2026-05-17T14:30:00Z',
    avaliadoEm: '2026-06-10T18:30:00Z',
    efetivadoEm: null,
  },
];

describe('RetidosLiberadosTable', () => {
  it('renders retained credit release details', () => {
    render(<RetidosLiberadosTable items={items} />);

    expect(screen.getByText('2026-03')).toBeInTheDocument();
    expect(screen.getByText('Maria Compositora')).toBeInTheDocument();
    expect(screen.getByText('Meu Bem Querer')).toBeInTheDocument();
    expect(screen.getByText('R$ 400,00')).toBeInTheDocument();
    expect(screen.getByText('Titular sem associação')).toBeInTheDocument();
    expect(screen.getByText('Previsto')).toBeInTheDocument();
  });

  it('renders an empty state', () => {
    render(<RetidosLiberadosTable items={[]} />);

    expect(screen.getByText(/nenhum crédito retido/i)).toBeInTheDocument();
  });
});
