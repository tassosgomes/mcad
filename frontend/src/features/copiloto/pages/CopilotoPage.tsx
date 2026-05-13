import { useState } from 'react';
import { Activity, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@components/ui/button';
import { PageHeader } from '@components/ui/page-header';
import { useAuth } from '@shared/auth/useAuth';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { resumeCopilotoWorkflow, sendCopilotoMessage } from '../api/copilotoApi';
import { ChatPanel } from '../components/ChatPanel';
import { WorkflowApproval } from '../components/WorkflowApproval';
import type { ChatMessage, ChatResponse, ProblemDetails, SuspendedWorkflow } from '../types/copiloto';
import styles from './CopilotoPage.module.css';

const EMPTY_ANSWER_MESSAGE = 'O Copiloto retornou uma resposta vazia. Tente reformular a pergunta.';

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toProblemDetails(error: unknown): ProblemDetails {
  if (typeof error === 'object' && error !== null) {
    return error as ProblemDetails;
  }

  return {
    title: 'Erro inesperado',
    detail: 'Não foi possível concluir a operação.',
  };
}

function friendlyErrorMessage(error: unknown): string {
  const problem = toProblemDetails(error);

  if (problem.status === 403) {
    return 'Você não tem permissão para executar esta consulta pelo Copiloto.';
  }

  return problem.detail || problem.title || 'Não foi possível concluir a operação.';
}

function responseToAssistantMessage(response: ChatResponse): ChatMessage {
  const answer = response.answer.trim() || EMPTY_ANSWER_MESSAGE;

  return {
    id: createMessageId(),
    role: 'assistant',
    content: answer,
    createdAt: new Date().toISOString(),
    toolCalls: response.toolCalls,
    suspendedWorkflow: response.suspendedWorkflow,
  };
}

export function CopilotoPage() {
  useDocumentTitle('Copiloto Operacional - mini-ECAD');

  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [threadId, setThreadId] = useState<string | undefined>();
  const [activeWorkflow, setActiveWorkflow] = useState<SuspendedWorkflow | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isResumingWorkflow, setIsResumingWorkflow] = useState(false);
  const [chatError, setChatError] = useState<string | undefined>();
  const [workflowError, setWorkflowError] = useState<string | undefined>();

  const handleSubmit = async (message: string) => {
    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setDraft('');
    setChatError(undefined);
    setWorkflowError(undefined);
    setIsSending(true);

    try {
      const response = await sendCopilotoMessage(
        {
          message,
          threadId,
        },
        getToken(),
      );

      setThreadId(response.threadId);
      setActiveWorkflow(response.suspendedWorkflow ?? null);
      setMessages((currentMessages) => [...currentMessages, responseToAssistantMessage(response)]);
    } catch (error) {
      setChatError(friendlyErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const handleWorkflowDecision = async (approved: boolean) => {
    if (!activeWorkflow) {
      return;
    }

    setWorkflowError(undefined);
    setIsResumingWorkflow(true);

    try {
      const response = await resumeCopilotoWorkflow(
        activeWorkflow,
        {
          stepId: activeWorkflow.stepId,
          approved,
        },
        getToken(),
      );

      setThreadId(response.threadId);
      setActiveWorkflow(response.suspendedWorkflow ?? null);
      setMessages((currentMessages) => [...currentMessages, responseToAssistantMessage(response)]);
    } catch (error) {
      setWorkflowError(friendlyErrorMessage(error));
    } finally {
      setIsResumingWorkflow(false);
    }
  };

  const handleNewSession = () => {
    setMessages([]);
    setDraft('');
    setThreadId(undefined);
    setActiveWorkflow(null);
    setChatError(undefined);
    setWorkflowError(undefined);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Copiloto Operacional"
        description="Chat assistido por IA para consultar dados e validar fluxos operacionais do MCAD."
        action={
          <Button type="button" variant="secondary" onClick={handleNewSession}>
            <RefreshCw size={16} /> Nova sessão
          </Button>
        }
      />

      <div className={styles.layout}>
        <ChatPanel
          messages={messages}
          draft={draft}
          isSubmitting={isSending}
          errorMessage={chatError}
          onDraftChange={setDraft}
          onSubmit={(message) => void handleSubmit(message)}
        />

        <aside className={styles.sideRail} aria-label="Contexto do Copiloto">
          <section className={styles.statusPanel}>
            <div className={styles.statusHeader}>
              <Activity size={18} aria-hidden="true" />
              <h2>Estado da sessão</h2>
            </div>
            <dl>
              <div>
                <dt>Thread</dt>
                <dd>{threadId ?? 'Ainda não iniciada'}</dd>
              </div>
              <div>
                <dt>Mensagens</dt>
                <dd>{messages.length}</dd>
              </div>
            </dl>
          </section>

          {activeWorkflow ? (
            <WorkflowApproval
              workflow={activeWorkflow}
              isSubmitting={isResumingWorkflow}
              errorMessage={workflowError}
              onApprove={() => void handleWorkflowDecision(true)}
              onCancel={() => void handleWorkflowDecision(false)}
            />
          ) : (
            <section className={styles.permissionPanel}>
              <ShieldAlert size={18} aria-hidden="true" />
              <div>
                <h2>Permissões por tool</h2>
                <p>
                  Quando uma consulta for negada, o Copiloto exibirá a falha sem mostrar payloads
                  técnicos ou dados protegidos.
                </p>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
