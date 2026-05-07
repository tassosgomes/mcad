import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CreditoCalculo } from '../types/calculo';
import { CreditosTable } from './CreditosTable';

const creditos: CreditoCalculo[] = [
  {
    id: 'credito-autoral',
    titularId: '11111111-1111-1111-1111-111111111111',
    titularNome: 'Maria Autora',
    obraId: '22222222-2222-2222-2222-222222222222',
    obraTitulo: 'Canção Autoral',
    fonogramaId: null,
    categoria: 'AUTORAL',
    subcategoriaConexa: null,
    percentualAplicado: '100.000000',
    valorObra: '1000.00',
    valorCredito: '1000.00',
    pontosObra: '20.000000',
    status: 'CALCULADO',
    criadoEm: '2026-05-07T18:00:00Z',
  },
  {
    id: 'credito-conexo',
    titularId: '33333333-3333-3333-3333-333333333333',
    titularNome: 'João Intérprete',
    obraId: '44444444-4444-4444-4444-444444444444',
    obraTitulo: 'Canção Conexa',
    fonogramaId: '55555555-5555-5555-5555-555555555555',
    categoria: 'CONEXO',
    subcategoriaConexa: 'INTERPRETE',
    percentualAplicado: '50.000000',
    valorObra: '333.30',
    valorCredito: '166.65',
    pontosObra: '10.000000',
    status: 'CALCULADO',
    criadoEm: '2026-05-07T18:01:00Z',
  },
];

describe('CreditosTable', () => {
  it('renders AUTORAL rows without neighboring subcategory and CONEXO rows with subcategory', () => {
    render(
      <CreditosTable
        creditos={creditos}
        metadata={{ page: 0, size: 20, total: 2, totalPages: 1 }}
        onPageChange={vi.fn()}
      />,
    );

    const autoralRow = screen.getByText('Maria Autora').closest('tr');
    const conexoRow = screen.getByText('João Intérprete').closest('tr');

    expect(autoralRow).not.toBeNull();
    expect(conexoRow).not.toBeNull();
    expect(within(autoralRow as HTMLTableRowElement).getByText('Autoral')).toBeInTheDocument();
    expect(within(autoralRow as HTMLTableRowElement).getAllByText('-')).toHaveLength(2);
    expect(within(conexoRow as HTMLTableRowElement).getByText('Conexo')).toBeInTheDocument();
    expect(within(conexoRow as HTMLTableRowElement).getByText('Intérprete')).toBeInTheDocument();
  });

  it('renders empty and paginated states', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CreditosTable
        creditos={[]}
        metadata={{ page: 1, size: 20, total: 55, totalPages: 3 }}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText(/nenhum crédito encontrado/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /anterior/i }));
    await user.click(screen.getByRole('button', { name: /próxima/i }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 0);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 2);
  });
});
