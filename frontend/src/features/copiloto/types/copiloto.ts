export type ToolCallStatus = 'success' | 'denied' | 'error';

export interface ChatRequest {
  message: string;
  threadId?: string;
  workflowHint?: string;
}

export interface ToolCallSummary {
  toolId: string;
  status: ToolCallStatus;
}

export interface SuspendedWorkflow {
  workflowId: string;
  runId: string;
  stepId: string;
  proposal?: string;
}

export interface ChatResponse {
  threadId: string;
  answer: string;
  toolCalls: ToolCallSummary[];
  suspendedWorkflow?: SuspendedWorkflow;
}

export interface WorkflowResumeRequest {
  stepId: string;
  approved: boolean;
}

export interface ProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  instance?: string;
}

export type ChatMessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  toolCalls?: ToolCallSummary[];
  suspendedWorkflow?: SuspendedWorkflow;
}
