import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '@shared/auth/AuthContext';
import { CopilotoPage } from './CopilotoPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderWithAuth(children: ReactNode) {
  const authValue: AuthContextValue = {
    user: null,
    isAuthenticated: true,
    isLoggingOut: false,
    roles: ['analista-cadastro'],
    hasRole: (role: string) => role === 'analista-cadastro',
    login: async () => undefined,
    logout: async () => undefined,
    getToken: () => 'token-123',
  };

  return render(
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>,
  );
}

describe('CopilotoPage', () => {
  it('sends a chat message to the BFF and renders answer, tools, and workflow approval', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      threadId: 'thread-1',
      answer: 'A rubrica está pronta, mas exige aprovação para continuar.',
      toolCalls: [
        { toolId: 'validar-distribuicao', status: 'success' },
      ],
      suspendedWorkflow: {
        workflowId: 'preparar-acao-sensivel',
        runId: 'run-1',
        stepId: 'approval-1',
        proposal: 'Executar preparação controlada da distribuição.',
      },
    }));

    renderWithAuth(<CopilotoPage />);

    await userEvent.type(
      screen.getByLabelText(/mensagem/i),
      'Validar distribuição da rubrica TV 2026-05',
    );
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));

    expect(await screen.findByText(/a rubrica está pronta/i)).toBeInTheDocument();
    expect(screen.getByText('validar-distribuicao')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /aprovação necessária/i })).toBeInTheDocument();
    expect(screen.getByText('Executar preparação controlada da distribuição.')).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe('/api/ai/v1/chat');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({
        message: 'Validar distribuição da rubrica TV 2026-05',
      }),
    });
    expect((fetchMock.mock.calls[0][1]?.headers as Headers).get('Authorization')).toBe('Bearer token-123');
  });

  it('shows a friendly permission message when the BFF returns 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      status: 403,
      title: 'Forbidden',
      detail: 'technical permission payload',
    }, 403));

    renderWithAuth(<CopilotoPage />);

    await userEvent.type(screen.getByLabelText(/mensagem/i), 'Consultar pagamento protegido');
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));

    expect(await screen.findByText(/você não tem permissão/i)).toBeInTheDocument();
    expect(screen.queryByText('technical permission payload')).not.toBeInTheDocument();
  });
});
