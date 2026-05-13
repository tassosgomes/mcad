import type {
  ChatRequest,
  ChatResponse,
  ProblemDetails,
  SuspendedWorkflow,
  WorkflowResumeRequest,
} from '../types/copiloto';

const AI_API_BASE_PATH = '/api/ai/v1';

function createHeaders(accessToken?: string | null): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json' });

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

async function parseProblem(response: Response, path: string): Promise<ProblemDetails> {
  const fallback: ProblemDetails = {
    status: response.status,
    title: response.statusText,
    detail: 'Não foi possível concluir a operação.',
    instance: path,
  };

  const payload: unknown = await response.json().catch(() => fallback);

  if (typeof payload !== 'object' || payload === null) {
    return fallback;
  }

  return {
    ...fallback,
    ...(payload as Partial<ProblemDetails>),
  };
}

async function postJson<TResponse>(
  path: string,
  body: unknown,
  accessToken?: string | null,
): Promise<TResponse> {
  const response = await fetch(`${AI_API_BASE_PATH}${path}`, {
    method: 'POST',
    headers: createHeaders(accessToken),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await parseProblem(response, path);
  }

  return response.json() as Promise<TResponse>;
}

export function sendCopilotoMessage(
  request: ChatRequest,
  accessToken?: string | null,
): Promise<ChatResponse> {
  return postJson<ChatResponse>('/chat', request, accessToken);
}

export function resumeCopilotoWorkflow(
  workflow: SuspendedWorkflow,
  request: WorkflowResumeRequest,
  accessToken?: string | null,
): Promise<ChatResponse> {
  return postJson<{
    workflowId: string;
    runId: string;
    status: string;
    output?: {
      mensagem?: string;
      aprovado?: boolean;
      approved?: boolean;
      escritaExecutada?: boolean;
    };
  }>(
    `/workflows/${encodeURIComponent(workflow.workflowId)}/runs/${encodeURIComponent(workflow.runId)}/resume`,
    request,
    accessToken,
  ).then((response) => ({
    threadId: workflow.runId,
    answer: response.output?.mensagem ?? 'Decisão registrada para o workflow.',
    toolCalls: [],
  }));
}
