import type { FormEvent } from 'react';
import { Bot, Loader2, Send, UserRound } from 'lucide-react';
import { Button } from '@components/ui/button';
import type { ChatMessage } from '../types/copiloto';
import { ToolTraceList } from './ToolTraceList';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  messages: ChatMessage[];
  draft: string;
  isSubmitting: boolean;
  errorMessage?: string;
  onDraftChange: (value: string) => void;
  onSubmit: (message: string) => void;
}

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ChatPanel({
  messages,
  draft,
  isSubmitting,
  errorMessage,
  onDraftChange,
  onSubmit,
}: ChatPanelProps) {
  const trimmedDraft = draft.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedDraft || isSubmitting) {
      return;
    }

    onSubmit(trimmedDraft);
  };

  return (
    <section className={styles.panel} aria-labelledby="copiloto-chat-title">
      <div className={styles.header}>
        <div>
          <h2 id="copiloto-chat-title">Conversa operacional</h2>
          <p>Faça perguntas sobre obras, pagamentos e pré-requisitos de distribuição.</p>
        </div>
      </div>

      <div className={styles.messages} aria-live="polite">
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <Bot size={24} aria-hidden="true" />
            <p>Nenhuma mensagem nesta sessão.</p>
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={[styles.message, styles[message.role]].join(' ')}
              aria-label={message.role === 'user' ? 'Mensagem do usuário' : 'Resposta do Copiloto'}
            >
              <div className={styles.avatar} aria-hidden="true">
                {message.role === 'user' ? <UserRound size={18} /> : <Bot size={18} />}
              </div>
              <div className={styles.bubble}>
                <div className={styles.messageMeta}>
                  <span>{message.role === 'user' ? 'Você' : 'Copiloto'}</span>
                  <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                </div>
                <p>{message.content}</p>
                {message.toolCalls && <ToolTraceList toolCalls={message.toolCalls} />}
              </div>
            </article>
          ))
        )}

        {isSubmitting && (
          <div className={styles.pending} role="status">
            <Loader2 size={16} aria-hidden="true" />
            Consultando contexto operacional...
          </div>
        )}
      </div>

      {errorMessage && (
        <div className={styles.error} role="alert">
          {errorMessage}
        </div>
      )}

      <form className={styles.composer} onSubmit={handleSubmit}>
        <label htmlFor="copiloto-message">Mensagem</label>
        <div className={styles.inputRow}>
          <textarea
            id="copiloto-message"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Ex.: Verifique se a rubrica TV 2026-05 está pronta para distribuição"
            rows={4}
            maxLength={4000}
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={!trimmedDraft || isSubmitting}>
            {isSubmitting ? <Loader2 size={16} /> : <Send size={16} />}
            Enviar
          </Button>
        </div>
      </form>
    </section>
  );
}
