import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AbrirSolicitacaoPage } from '../AbrirSolicitacaoPage';

const navigateMock = vi.hoisted(() => vi.fn());
const showToastMock = vi.hoisted(() => vi.fn());
const criarSolicitacaoMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams()],
  };
});

vi.mock('@components/ui/toast', () => ({
  useToast: () => ({ showToast: showToastMock, addToast: vi.fn() }),
}));

vi.mock('../../../solicitacoes/hooks/useSolicitacoes', () => ({
  useSolicitacoes: vi.fn(),
  useCriarSolicitacao: () => ({
    mutateAsync: criarSolicitacaoMock,
    isPending: false,
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/portal/solicitacoes/abrir']}>
      <AbrirSolicitacaoPage />
    </MemoryRouter>,
  );
}

function getCampoSelect() {
  return screen.getByRole('combobox', { name: 'Campo a alterar' });
}

function getValorInput() {
  return screen.getByPlaceholderText('Informe o novo valor desejado');
}

function getJustificativaInput() {
  return screen.getByPlaceholderText('Explique o motivo da alteração');
}

describe('AbrirSolicitacaoPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    showToastMock.mockReset();
    criarSolicitacaoMock.mockReset();
  });

  it('renders the form', () => {
    renderPage();
    expect(screen.getByText('Solicitar Alteração')).toBeInTheDocument();
    expect(getCampoSelect()).toBeInTheDocument();
    expect(getValorInput()).toBeInTheDocument();
    expect(getJustificativaInput()).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitação' }));

    await waitFor(() => {
      expect(screen.getByText('Valor pretendido é obrigatório')).toBeInTheDocument();
      expect(screen.getByText('Justificativa é obrigatória')).toBeInTheDocument();
    });
    expect(criarSolicitacaoMock).not.toHaveBeenCalled();
  });

  it('shows association warning when campo is ASSOCIACAO (RF-21)', async () => {
    renderPage();
    fireEvent.change(getCampoSelect(), { target: { value: 'ASSOCIACAO' } });

    await waitFor(() => {
      expect(
        screen.getByText(
          'Se houver distribuição em curso, esta alteração será considerada apenas no próximo processamento.',
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('requires non-empty valorPretendido for ASSOCIACAO (RF-20)', async () => {
    renderPage();
    fireEvent.change(getCampoSelect(), { target: { value: 'ASSOCIACAO' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitação' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'A associação de destino é obrigatória. O vínculo só pode ser alterado, nunca removido.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('calls criarSolicitacao and navigates on success', async () => {
    criarSolicitacaoMock.mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(getValorInput(), { target: { value: 'João Silva' } });
    fireEvent.change(getJustificativaInput(), { target: { value: 'Nome incorreto no cadastro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitação' }));

    await waitFor(() => {
      expect(criarSolicitacaoMock).toHaveBeenCalledWith({
        campo: 'NOME',
        valorPretendido: 'João Silva',
        justificativa: 'Nome incorreto no cadastro',
      });
    });
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Solicitação enviada com sucesso!',
        'success',
      );
      expect(navigateMock).toHaveBeenCalledWith('/portal/solicitacoes', { replace: true });
    });
  });

  it('does not show warning for non-ASSOCIACAO campos', () => {
    renderPage();
    expect(
      screen.queryByText(/Se houver distribuição em curso/),
    ).not.toBeInTheDocument();
  });
});
