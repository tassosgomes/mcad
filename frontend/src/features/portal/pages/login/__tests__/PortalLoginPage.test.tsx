import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PortalLoginPage } from '../PortalLoginPage';

const navigateMock = vi.hoisted(() => vi.fn());
const loginMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../shared/auth/usePortalAuth', () => ({
  usePortalAuth: () => ({
    login: loginMock,
    isAuthenticated: false,
    titular: null,
    token: null,
    isLoading: false,
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/portal/login']}>
      <PortalLoginPage />
    </MemoryRouter>,
  );
}

describe('PortalLoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    loginMock.mockReset();
  });

  it('renders the login form', () => {
    renderPage();
    expect(screen.getByText('Portal do Titular')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('000.000.000-00 ou 00.000.000/0001-00')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sua senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('shows link to auto-cadastro', () => {
    renderPage();
    const link = screen.getByText('Criar conta');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/portal/auto-cadastro');
  });

  it('calls login on submit and navigates on success', async () => {
    loginMock.mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('000.000.000-00 ou 00.000.000/0001-00'), {
      target: { value: '123.456.789-00' },
    });
    fireEvent.change(screen.getByPlaceholderText('Sua senha'), {
      target: { value: 'minhasenha' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('123.456.789-00', 'minhasenha');
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/portal', { replace: true });
    });
  });

  it('displays error message on login failure', async () => {
    loginMock.mockRejectedValue(new Error('Credenciais inválidas'));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('000.000.000-00 ou 00.000.000/0001-00'), {
      target: { value: '000.000.000-00' },
    });
    fireEvent.change(screen.getByPlaceholderText('Sua senha'), {
      target: { value: 'errada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Credenciais inválidas');
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
