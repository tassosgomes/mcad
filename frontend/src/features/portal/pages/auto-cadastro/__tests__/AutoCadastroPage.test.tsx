import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AutoCadastroPage } from '../AutoCadastroPage';
import { PortalApiError } from '../../../shared/auth/PortalAuthProvider';

const navigateMock = vi.hoisted(() => vi.fn());
const signupMock = vi.hoisted(() => vi.fn());
const showToastMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../shared/auth/usePortalAuth', () => ({
  usePortalAuth: () => ({
    signup: signupMock,
    login: vi.fn(),
    isAuthenticated: false,
    titular: null,
    token: null,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

vi.mock('@components/ui/toast', () => ({
  useToast: () => ({ showToast: showToastMock, addToast: vi.fn() }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/portal/auto-cadastro']}>
      <AutoCadastroPage />
    </MemoryRouter>,
  );
}

function getDocumentoInput() {
  return screen.getByPlaceholderText('000.000.000-00 ou 00.000.000/0001-00');
}

function getCaeIpiInput() {
  return screen.getByPlaceholderText('000.000.00.00');
}

function getSenhaInput() {
  return screen.getByPlaceholderText('Mínimo 4 caracteres');
}

function getConfirmarSenhaInput() {
  return screen.getByPlaceholderText('Repita a senha');
}

describe('AutoCadastroPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signupMock.mockReset();
    showToastMock.mockReset();
  });

  it('renders the signup form', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Criar Conta' })).toBeInTheDocument();
    expect(getDocumentoInput()).toBeInTheDocument();
    expect(getCaeIpiInput()).toBeInTheDocument();
    expect(getSenhaInput()).toBeInTheDocument();
    expect(getConfirmarSenhaInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar Conta' })).toBeInTheDocument();
  });

  it('shows info banner about existing ECAD registration', () => {
    renderPage();
    expect(
      screen.getByText(/você precisa já existir como titular no sistema ECAD/i),
    ).toBeInTheDocument();
  });

  it('validates password minimum length', async () => {
    renderPage();
    fireEvent.change(getDocumentoInput(), { target: { value: '123.456.789-00' } });
    fireEvent.change(getCaeIpiInput(), { target: { value: '000.000.00.00' } });
    fireEvent.change(getSenhaInput(), { target: { value: 'ab' } });
    fireEvent.change(getConfirmarSenhaInput(), { target: { value: 'ab' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Conta' }));

    await waitFor(() => {
      expect(screen.getByText(/A senha deve ter no mínimo 4 caracteres/)).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    renderPage();
    fireEvent.change(getDocumentoInput(), { target: { value: '123.456.789-00' } });
    fireEvent.change(getCaeIpiInput(), { target: { value: '000.000.00.00' } });
    fireEvent.change(getSenhaInput(), { target: { value: 'senha123' } });
    fireEvent.change(getConfirmarSenhaInput(), { target: { value: 'diferente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Conta' }));

    await waitFor(() => {
      expect(screen.getByText('As senhas não conferem')).toBeInTheDocument();
    });
  });

  it('calls signup and navigates to login on success', async () => {
    signupMock.mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(getDocumentoInput(), { target: { value: '123.456.789-00' } });
    fireEvent.change(getCaeIpiInput(), { target: { value: '000.000.00.00' } });
    fireEvent.change(getSenhaInput(), { target: { value: 'senha123' } });
    fireEvent.change(getConfirmarSenhaInput(), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Conta' }));

    await waitFor(() => {
      expect(signupMock).toHaveBeenCalledWith('123.456.789-00', '000.000.00.00', 'senha123');
    });
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Conta criada com sucesso! Faça login para continuar.',
        'success',
      );
      expect(navigateMock).toHaveBeenCalledWith('/portal/login', { replace: true });
    });
  });

  it('shows error toast on signup failure with 409', async () => {
    signupMock.mockRejectedValue(new PortalApiError(409, 'Já existe uma conta para este CPF/CNPJ'));
    renderPage();

    fireEvent.change(getDocumentoInput(), { target: { value: '123.456.789-00' } });
    fireEvent.change(getCaeIpiInput(), { target: { value: '000.000.00.00' } });
    fireEvent.change(getSenhaInput(), { target: { value: 'senha123' } });
    fireEvent.change(getConfirmarSenhaInput(), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Conta' }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Já existe uma conta para este CPF/CNPJ',
        'error',
      );
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
