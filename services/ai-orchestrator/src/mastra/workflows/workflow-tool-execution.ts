import type { RuntimeContext } from '@mastra/core/runtime-context';
import { HttpProblemError } from '../../http/errors.js';
import { recordToolCall } from '../../observability/metrics.js';
import type { ToolSource } from '../tools/tool-results.js';

export interface ExecutableTool<TInput, TOutput> {
  execute(context: { context: TInput; runtimeContext: RuntimeContext }, options?: { abortSignal?: AbortSignal }): Promise<TOutput>;
}

export type ToolExecutionResult<TOutput> =
  | { ok: true; output: TOutput; source: ToolSource }
  | { ok: false; warning: string; source: ToolSource };

export async function executeWorkflowTool<TInput, TOutput extends { source: ToolSource }>(
  tool: ExecutableTool<TInput, TOutput>,
  toolId: string,
  input: TInput,
  runtimeContext: RuntimeContext,
  abortSignal?: AbortSignal,
): Promise<ToolExecutionResult<TOutput>> {
  let recordedStatus: 'success' | 'denied' | 'error' = 'success';

  try {
    const output = await tool.execute({ context: input, runtimeContext }, { abortSignal });

    return {
      ok: true,
      output,
      source: output.source,
    };
  } catch (error) {
    const status = error instanceof HttpProblemError && error.status === 403 ? 'denied' : 'error';
    recordedStatus = status;
    const warning = error instanceof Error ? error.message : 'Falha inesperada ao executar tool.';

    return {
      ok: false,
      warning,
      source: {
        toolId,
        status,
        detail: warning,
      },
    };
  } finally {
    // Workflow-level accounting records attempted tool execution. Direct agent tool calls are
    // summarized at the chat endpoint.
    recordToolCall(toolId, recordedStatus);
  }
}
