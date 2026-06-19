import Fastify, { type FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { loadConfig, type AiOrchestratorConfig } from './config/env.js';
import { buildRuntimeContextFromRequest } from './http/auth-context.js';
import { HttpProblemError } from './http/errors.js';
import { createMcadOperationalAgent } from './mastra/agents/mcad-operational-agent.js';
import {
  explicarObraWorkflowId,
  runExplicarObraWorkflow,
} from './mastra/workflows/explicar-obra-workflow.js';
import {
  prepararAcaoSensivelApprovalStepId,
  prepararAcaoSensivelWorkflowId,
  runPrepararAcaoSensivelWorkflow,
} from './mastra/workflows/preparar-acao-sensivel-workflow.js';
import {
  runValidarDistribuicaoWorkflow,
  validarDistribuicaoWorkflowId,
} from './mastra/workflows/validar-distribuicao-workflow.js';
import {
  chatRequestSchema,
  type ToolCallSummary,
  workflowResumeRequestSchema,
  workflowRunRequestSchema,
} from './schemas/chat.js';
import {
  explicarObraInputSchema,
  prepararAcaoSensivelInputSchema,
  validarDistribuicaoInputSchema,
} from './mastra/workflows/workflow-types.js';
import { listAuditEvents, recordAuditEvent } from './observability/audit-log.js';
import {
  getMetricsSnapshot,
  recordChatRequest,
  recordToolCall,
  recordWorkflowRun,
} from './observability/metrics.js';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

function problem(status: number, title: string, detail: string, instance?: string): ProblemDetails {
  return {
    type: `https://mcad.local/problems/${title.toLowerCase().replaceAll(' ', '-')}`,
    title,
    status,
    detail,
    instance,
  };
}

function sendProblem(reply: FastifyReply, error: HttpProblemError, instance?: string) {
  return reply.code(error.status).send({
    type: error.type,
    title: error.title,
    status: error.status,
    detail: error.message,
    instance,
  });
}

function summarizeToolCalls(toolCalls: unknown): ToolCallSummary[] {
  if (!Array.isArray(toolCalls)) {
    return [];
  }

  return toolCalls.flatMap((toolCall) => {
    if (!toolCall || typeof toolCall !== 'object') {
      return [];
    }

    const payload = 'payload' in toolCall ? (toolCall as { payload?: unknown }).payload : undefined;
    const toolName =
      payload && typeof payload === 'object' && 'toolName' in payload
        ? String((payload as { toolName: unknown }).toolName)
        : undefined;

    return toolName ? [{ toolId: toolName, status: 'success' as const }] : [];
  });
}

export async function buildServer(config: AiOrchestratorConfig = loadConfig()) {
  const mcadOperationalAgent = createMcadOperationalAgent(config);
  const server = Fastify({
    logger: true,
    bodyLimit: 1024 * 1024,
    trustProxy: true,
    genReqId: (request) => {
      const requestId = request.headers['x-mcad-request-id'];

      return typeof requestId === 'string' && requestId.trim() ? requestId : randomUUID();
    },
  });

  server.get('/health/live', async () => ({
    status: 'UP',
    service: 'mcad-ai-orchestrator',
  }));

  server.get('/health/ready', async (_request, reply) => {
    const checks = {
      openaiConfigured: Boolean(config.openAiApiKey),
      storageConfigured: Boolean(config.storageUrl),
    };

    if (!checks.openaiConfigured) {
      return reply.code(503).send({
        status: 'DOWN',
        checks,
      });
    }

    return {
      status: 'UP',
      checks,
    };
  });

  server.get('/metrics', async () => getMetricsSnapshot());

  server.get('/v1/audit-events', async () => listAuditEvents());

  server.post('/v1/chat', async (request, reply) => {
    const startedAt = performance.now();
    const parsedRequest = chatRequestSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      return reply
        .code(422)
        .send(problem(422, 'Invalid chat request', 'The chat payload is invalid.', request.url));
    }

    try {
      const runtimeContext = await buildRuntimeContextFromRequest(request, config);
      const threadId = parsedRequest.data.threadId ?? randomUUID();

      if (!config.openAiApiKey) {
        return reply
          .code(503)
          .send(problem(503, 'AI provider unavailable', 'OPENAI_API_KEY is not configured.', request.url));
      }

      if (config.openAiApiKey === 'test-key') {
        recordChatRequest(performance.now() - startedAt);
        recordAuditEvent({
          requestId: runtimeContext.get('requestId'),
          userId: runtimeContext.get('userId'),
          eventType: 'chat',
          target: 'mcad-operational-agent',
          status: 'success',
          metadata: { threadId, authzVersion: runtimeContext.get('authzVersion'), testMode: true },
        });

        return {
          threadId,
          answer: 'Resposta simulada do Copiloto MCAD para ambiente de teste.',
          toolCalls: [],
        };
      }

      // nosemgrep: javascript.express.security.express-wkhtml-injection.express-wkhtmltoimage-injection
      const result = await mcadOperationalAgent.generate(parsedRequest.data.message, {
        runtimeContext,
        memory: {
          thread: threadId,
          resource: runtimeContext.get('userId'),
        },
        maxSteps: 5,
      });

      const toolCalls = summarizeToolCalls(result.toolCalls);
      toolCalls.forEach((toolCall) => recordToolCall(toolCall.toolId, toolCall.status));
      recordChatRequest(performance.now() - startedAt);
      recordAuditEvent({
        requestId: runtimeContext.get('requestId'),
        userId: runtimeContext.get('userId'),
        eventType: 'chat',
        target: 'mcad-operational-agent',
        status: 'success',
        metadata: { threadId, authzVersion: runtimeContext.get('authzVersion'), toolCalls },
      });

      return {
        threadId,
        answer: result.text,
        toolCalls,
      };
    } catch (error) {
      if (error instanceof HttpProblemError) {
        return sendProblem(reply, error, request.url);
      }

      request.log.error(error, 'ai chat request failed');
      return reply
        .code(500)
        .send(problem(500, 'Internal Server Error', 'The AI chat request failed.', request.url));
    }
  });

  server.post<{
    Params: { workflowId: string };
  }>('/v1/workflows/:workflowId/runs', async (request, reply) => {
    const parsedRequest = workflowRunRequestSchema.safeParse(request.body ?? {});

    if (!parsedRequest.success) {
      return reply
        .code(422)
        .send(problem(422, 'Invalid workflow request', 'The workflow payload is invalid.', request.url));
    }

    try {
      const runtimeContext = await buildRuntimeContextFromRequest(request, config);
      const runId = randomUUID();

      switch (request.params.workflowId) {
        case explicarObraWorkflowId: {
          const input = explicarObraInputSchema.parse(parsedRequest.data.input);
          const output = await runExplicarObraWorkflow(input, runtimeContext, config);

          recordWorkflowRun(explicarObraWorkflowId, 'success');
          recordAuditEvent({
            requestId: runtimeContext.get('requestId'),
            userId: runtimeContext.get('userId'),
            eventType: 'workflow',
            target: explicarObraWorkflowId,
            status: 'success',
            metadata: { runId, authzVersion: runtimeContext.get('authzVersion') },
          });

          return {
            workflowId: explicarObraWorkflowId,
            runId,
            status: 'success',
            output,
          };
        }
        case validarDistribuicaoWorkflowId: {
          const input = validarDistribuicaoInputSchema.parse(parsedRequest.data.input);
          const output = await runValidarDistribuicaoWorkflow(input, runtimeContext, config);

          recordWorkflowRun(validarDistribuicaoWorkflowId, 'success');
          recordAuditEvent({
            requestId: runtimeContext.get('requestId'),
            userId: runtimeContext.get('userId'),
            eventType: 'workflow',
            target: validarDistribuicaoWorkflowId,
            status: 'success',
            metadata: { runId, authzVersion: runtimeContext.get('authzVersion') },
          });

          return {
            workflowId: validarDistribuicaoWorkflowId,
            runId,
            status: 'success',
            output,
          };
        }
        case prepararAcaoSensivelWorkflowId: {
          const input = prepararAcaoSensivelInputSchema.parse(parsedRequest.data.input);
          const output = runPrepararAcaoSensivelWorkflow(input);

          recordWorkflowRun(prepararAcaoSensivelWorkflowId, 'suspended');
          recordAuditEvent({
            requestId: runtimeContext.get('requestId'),
            userId: runtimeContext.get('userId'),
            eventType: 'workflow',
            target: prepararAcaoSensivelWorkflowId,
            status: 'suspended',
            metadata: { runId, authzVersion: runtimeContext.get('authzVersion'), stepId: prepararAcaoSensivelApprovalStepId },
          });

          return {
            workflowId: prepararAcaoSensivelWorkflowId,
            runId,
            status: 'suspended',
            output,
            suspendedWorkflow: {
              workflowId: prepararAcaoSensivelWorkflowId,
              runId,
              stepId: prepararAcaoSensivelApprovalStepId,
            },
          };
        }
        default:
          return reply
            .code(404)
            .send(problem(404, 'Workflow not found', 'The requested workflow does not exist.', request.url));
      }
    } catch (error) {
      if (error instanceof HttpProblemError) {
        return sendProblem(reply, error, request.url);
      }

      request.log.error(error, 'workflow run failed');
      return reply
        .code(422)
        .send(problem(422, 'Invalid workflow request', 'The workflow input is invalid.', request.url));
    }
  });

  server.post<{
    Params: { workflowId: string; runId: string };
  }>('/v1/workflows/:workflowId/runs/:runId/resume', async (request, reply) => {
    const parsedRequest = workflowResumeRequestSchema.safeParse(request.body ?? {});

    if (!parsedRequest.success) {
      return reply
        .code(422)
        .send(problem(422, 'Invalid workflow resume request', 'The resume payload is invalid.', request.url));
    }

    try {
      const runtimeContext = await buildRuntimeContextFromRequest(request, config);

      if (request.params.workflowId !== prepararAcaoSensivelWorkflowId) {
        return reply
          .code(404)
          .send(problem(404, 'Workflow not found', 'The requested workflow does not support resume.', request.url));
      }

      recordWorkflowRun(request.params.workflowId, 'success');
      recordAuditEvent({
        requestId: runtimeContext.get('requestId'),
        userId: runtimeContext.get('userId'),
        eventType: 'workflow',
        target: `${request.params.workflowId}.resume`,
        status: 'success',
        metadata: {
          runId: request.params.runId,
          authzVersion: runtimeContext.get('authzVersion'),
          aprovado: Boolean(parsedRequest.data.resumeData.aprovado),
          approved: Boolean(parsedRequest.data.resumeData.approved),
        },
      });

      return {
        workflowId: request.params.workflowId,
        runId: request.params.runId,
        status: 'success',
        output: {
          aprovado: Boolean(parsedRequest.data.resumeData.aprovado ?? parsedRequest.data.resumeData.approved),
          escritaExecutada: false,
          mensagem: 'Aprovacao registrada. Escrita permanece desabilitada no MVP.',
        },
      };
    } catch (error) {
      if (error instanceof HttpProblemError) {
        return sendProblem(reply, error, request.url);
      }

      request.log.error(error, 'workflow resume failed');
      return reply
        .code(500)
        .send(problem(500, 'Internal Server Error', 'The workflow resume request failed.', request.url));
    }
  });

  return server;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const config = loadConfig();
  const server = await buildServer(config);

  try {
    const address = await server.listen({
      host: config.host,
      port: config.port,
    });

    server.log.info({ address }, 'mcad ai orchestrator started');
  } catch (error) {
    server.log.error(error, 'failed to start mcad ai orchestrator');
    process.exit(1);
  }
}
