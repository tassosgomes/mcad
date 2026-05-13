import { z } from 'zod';
import { toolSourceSchema } from '../tools/tool-results.js';

export const workflowRunResultSchema = z.object({
  workflowId: z.string(),
  runId: z.string(),
  status: z.enum(['success', 'suspended', 'failed']),
  output: z.unknown().optional(),
  suspendedWorkflow: z.object({
    workflowId: z.string(),
    runId: z.string(),
    stepId: z.string(),
  }).optional(),
});

export const explicarObraInputSchema = z.object({
  termo: z.string().min(2),
});

export const explicarObraOutputSchema = z.object({
  resumo: z.string(),
  obra: z.unknown().optional(),
  titulares: z.unknown().optional(),
  fonogramas: z.unknown().optional(),
  auditoria: z.unknown().optional(),
  fontes: z.array(toolSourceSchema),
  avisos: z.array(z.string()),
});

export const validarDistribuicaoInputSchema = z.object({
  rubricaSigla: z.string().min(1),
  periodo: z.string().min(1),
});

export const validarDistribuicaoOutputSchema = z.object({
  apto: z.boolean(),
  bloqueios: z.array(z.string()),
  avisos: z.array(z.string()),
  fontes: z.array(toolSourceSchema),
});

export const prepararAcaoSensivelInputSchema = z.object({
  intencao: z.string().min(1),
  entidadeTipo: z.string().optional(),
  entidadeId: z.string().optional(),
});

export const prepararAcaoSensivelOutputSchema = z.object({
  proposta: z.string(),
  requerAprovacao: z.literal(true),
  escritaExecutada: z.literal(false),
});

export type WorkflowRunResult = z.infer<typeof workflowRunResultSchema>;
export type ExplicarObraInput = z.infer<typeof explicarObraInputSchema>;
export type ExplicarObraOutput = z.infer<typeof explicarObraOutputSchema>;
export type ValidarDistribuicaoInput = z.infer<typeof validarDistribuicaoInputSchema>;
export type ValidarDistribuicaoOutput = z.infer<typeof validarDistribuicaoOutputSchema>;
export type PrepararAcaoSensivelInput = z.infer<typeof prepararAcaoSensivelInputSchema>;
export type PrepararAcaoSensivelOutput = z.infer<typeof prepararAcaoSensivelOutputSchema>;
