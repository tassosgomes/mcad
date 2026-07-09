import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BuscaCadastroAutocomplete } from './BuscaCadastroAutocomplete';

const useBuscaCadastroMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useBuscaCadastro', () => ({
  useBuscaCadastro: useBuscaCadastroMock,
}));

describe('BuscaCadastroAutocomplete', () => {
  it('offers pending creation only when the search has no results', async () => {
    useBuscaCadastroMock.mockReturnValue({ data: [], isLoading: false });
    const user = userEvent.setup();

    render(<BuscaCadastroAutocomplete value={null} onChange={vi.fn()} />);

    await user.type(
      screen.getByPlaceholderText('Busque por Título, ISRC, ISWC ou Autor...'),
      'sem resultado',
    );

    expect(screen.getByRole('button', { name: 'Criar Obra' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Criar Fonograma' })).toBeDisabled();
  });

  it('does not offer pending creation when the search returns a match', async () => {
    useBuscaCadastroMock.mockReturnValue({
      data: [
        {
          id: 'obra-1',
          tipo: 'obra',
          titulo: 'Obra encontrada',
          codigoIdentificador: 'T-123.456.789-0',
          autoresOuInterpretes: 'Autor',
          status: 'LIBERADA',
          obraId: null,
        },
      ],
      isLoading: false,
    });
    const user = userEvent.setup();

    render(<BuscaCadastroAutocomplete value={null} onChange={vi.fn()} />);

    await user.type(
      screen.getByPlaceholderText('Busque por Título, ISRC, ISWC ou Autor...'),
      'obra',
    );

    expect(screen.getByText('Obra encontrada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar Obra' })).not.toBeInTheDocument();
  });

  it('allows creating a phonogram after an obra is selected', () => {
    useBuscaCadastroMock.mockReturnValue({ data: undefined, isLoading: false });

    render(
      <BuscaCadastroAutocomplete
        value={{ obraId: 'obra-1', fonogramaId: null, titulo: 'Obra selecionada' }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Criar Fonograma' })).toBeEnabled();
  });
});
