import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../types/copiloto';
import { ChatPanel } from './ChatPanel';

const assistantMessage: ChatMessage = {
  id: 'assistant-1',
  role: 'assistant',
  content: 'A obra está liberada para consulta.',
  createdAt: '2026-05-12T12:00:00Z',
  toolCalls: [
    { toolId: 'buscar-obra', status: 'success' },
    { toolId: 'consultar-pagamento', status: 'denied' },
  ],
};

describe('ChatPanel', () => {
  it('submits the typed message when the user clicks send', async () => {
    const user = userEvent.setup();
    const handleDraftChange = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <ChatPanel
        messages={[]}
        draft="Consultar obra ABC"
        isSubmitting={false}
        onDraftChange={handleDraftChange}
        onSubmit={handleSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(handleSubmit).toHaveBeenCalledWith('Consultar obra ABC');
  });

  it('renders messages with tool execution summaries', () => {
    render(
      <ChatPanel
        messages={[assistantMessage]}
        draft=""
        isSubmitting={false}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('A obra está liberada para consulta.')).toBeInTheDocument();
    expect(screen.getByLabelText('Ferramentas executadas')).toBeInTheDocument();
    expect(screen.getByText('buscar-obra')).toBeInTheDocument();
    expect(screen.getByText('consultar-pagamento')).toBeInTheDocument();
    expect(screen.getByText('Sem permissão')).toBeInTheDocument();
  });

  it('keeps submit disabled for empty drafts', () => {
    render(
      <ChatPanel
        messages={[]}
        draft="   "
        isSubmitting={false}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled();
  });
});
