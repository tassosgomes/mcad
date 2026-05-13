export interface AiMetricsSnapshot {
  chatRequestsTotal: number;
  chatLatencyMs: number[];
  toolCallsTotal: Record<string, Record<string, number>>;
  workflowRunsTotal: Record<string, Record<string, number>>;
  authzDeniedTotal: number;
}

const metrics: AiMetricsSnapshot = {
  chatRequestsTotal: 0,
  chatLatencyMs: [],
  toolCallsTotal: {},
  workflowRunsTotal: {},
  authzDeniedTotal: 0,
};

function incrementNestedCounter(container: Record<string, Record<string, number>>, key: string, status: string): void {
  container[key] = container[key] ?? {};
  container[key][status] = (container[key][status] ?? 0) + 1;
}

export function recordChatRequest(latencyMs: number): void {
  metrics.chatRequestsTotal += 1;
  metrics.chatLatencyMs.push(latencyMs);
}

export function recordToolCall(toolId: string, status: 'success' | 'denied' | 'error'): void {
  incrementNestedCounter(metrics.toolCallsTotal, toolId, status);

  if (status === 'denied') {
    metrics.authzDeniedTotal += 1;
  }
}

export function recordWorkflowRun(workflowId: string, status: 'success' | 'suspended' | 'failed'): void {
  incrementNestedCounter(metrics.workflowRunsTotal, workflowId, status);
}

export function getMetricsSnapshot(): AiMetricsSnapshot {
  return {
    chatRequestsTotal: metrics.chatRequestsTotal,
    chatLatencyMs: [...metrics.chatLatencyMs],
    toolCallsTotal: structuredClone(metrics.toolCallsTotal),
    workflowRunsTotal: structuredClone(metrics.workflowRunsTotal),
    authzDeniedTotal: metrics.authzDeniedTotal,
  };
}

export function resetMetrics(): void {
  metrics.chatRequestsTotal = 0;
  metrics.chatLatencyMs = [];
  metrics.toolCallsTotal = {};
  metrics.workflowRunsTotal = {};
  metrics.authzDeniedTotal = 0;
}
