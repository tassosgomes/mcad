import { z } from 'zod';

export const toolCallStatusSchema = z.enum(['success', 'denied', 'error']);

export const toolCallSummarySchema = z.object({
  toolId: z.string(),
  status: toolCallStatusSchema,
});

export const suspendedWorkflowSchema = z.object({
  workflowId: z.string(),
  runId: z.string(),
  stepId: z.string(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  threadId: z.string().uuid().optional(),
  workflowHint: z.string().optional(),
});

export const chatResponseSchema = z.object({
  threadId: z.string(),
  answer: z.string(),
  toolCalls: z.array(toolCallSummarySchema),
  suspendedWorkflow: suspendedWorkflowSchema.optional(),
});

export const workflowRunRequestSchema = z.object({
  input: z.record(z.string(), z.unknown()).default({}),
});

export const workflowResumeRequestSchema = z.object({
  resumeData: z.record(z.string(), z.unknown()).default({}),
});

export type ToolCallStatus = z.infer<typeof toolCallStatusSchema>;
export type ToolCallSummary = z.infer<typeof toolCallSummarySchema>;
export type SuspendedWorkflow = z.infer<typeof suspendedWorkflowSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type WorkflowRunRequest = z.infer<typeof workflowRunRequestSchema>;
export type WorkflowResumeRequest = z.infer<typeof workflowResumeRequestSchema>;
