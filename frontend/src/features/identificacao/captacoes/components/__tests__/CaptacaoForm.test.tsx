import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CaptacaoForm } from '../CaptacaoForm';
import type { CaptacaoDetalhe } from '../../types/captacao';

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function getUsuarioCombobox(): HTMLInputElement {
  return screen.getByPlaceholderText(/Buscar por razão social/) as HTMLInputElement;
}

function getPeriodoInput(): HTMLInputElement {
  return document.getElementById('captacao-periodo') as HTMLInputElement;
}

function getRubricaSelect(): HTMLSelectElement {
  return document.getElementById('captacao-rubrica') as HTMLSelectElement;
}

const mockCaptacaoDetalhe: CaptacaoDetalhe = {
  id: 'capt-1',
  rubrica: { id: 'rub-1', sigla: 'RADIO', nome: 'Rádio', exigeClassificacao: false },
  periodo: '2026-06-01',
  usuarioDeMusica: 'Rádio Globo SP Ltda',
  usuarioMusicaId: 'u1',
  usuarioMusicaNome: 'Rádio Globo SP Ltda',
  status: 'ABERTA',
  analistaResponsavel: { id: 'analista-1', nome: 'João' },
  criadoEm: '2026-06-01T10:00:00Z',
  atualizadoEm: '2026-06-01T10:00:00Z',
  distribuicaoProcessada: false,
  resumoExecucoes: { total: 0, identificadas: 0, pendentes: 0 },
};

describe('CaptacaoForm', () => {
  it('blocks submit when no usuario selected', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    renderWithQueryClient(
      <CaptacaoForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        isSubmitting={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByText('Selecione um usuário de música')).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('pre-populates usuarioMusicaNome from initialData in edit mode', async () => {
    renderWithQueryClient(
      <CaptacaoForm
        initialData={mockCaptacaoDetalhe}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={false}
      />,
    );

    const input = getUsuarioCombobox();
    expect(input.value).toBe('Rádio Globo SP Ltda');
  });

  it('submits with selected usuarioMusicaId and usuarioMusicaNome', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    renderWithQueryClient(
      <CaptacaoForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        isSubmitting={false}
      />,
    );

    const rubricaSelect = getRubricaSelect();

    await waitFor(() => {
      expect(rubricaSelect).not.toBeDisabled();
    });

    await user.selectOptions(rubricaSelect, 'rub-1');

    const periodoInput = getPeriodoInput();
    await user.type(periodoInput, '2026-06-15');

    const combobox = getUsuarioCombobox();
    await user.type(combobox, 'Globo');

    await waitFor(() => {
      expect(screen.getByText('Rádio Globo SP Ltda')).toBeInTheDocument();
    });

    const option = screen.getByText('Rádio Globo SP Ltda');
    await user.click(option);

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioMusicaId: 'u1',
          usuarioMusicaNome: 'Rádio Globo SP Ltda',
        }),
      );
    });
  });

  it('shows empty state message when no results found', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <CaptacaoForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={false}
      />,
    );

    const combobox = getUsuarioCombobox();
    await user.type(combobox, 'ZZZZZ');

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum usuário encontrado. Verifique o cadastro na Arrecadação.'),
      ).toBeInTheDocument();
    });
  });

  it('clears selection when search text is cleared', async () => {
    renderWithQueryClient(
      <CaptacaoForm
        initialData={mockCaptacaoDetalhe}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={false}
      />,
    );

    const combobox = getUsuarioCombobox();
    const user = userEvent.setup();

    await user.clear(combobox);

    await waitFor(() => {
      expect(combobox.value).toBe('');
    });
  });
});
