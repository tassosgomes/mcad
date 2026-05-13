import { z } from 'zod';

export const toolSourceSchema = z.object({
  toolId: z.string(),
  status: z.enum(['success', 'denied', 'error']),
  detail: z.string().optional(),
});

export const lookupItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const lookupResultSchema = z.object({
  items: z.array(lookupItemSchema),
  source: toolSourceSchema,
});

export const checklistResultSchema = z.object({
  apto: z.boolean(),
  bloqueios: z.array(z.string()),
  avisos: z.array(z.string()),
  fontes: z.array(toolSourceSchema),
});

export type ToolSource = z.infer<typeof toolSourceSchema>;
export type LookupItem = z.infer<typeof lookupItemSchema>;
export type LookupResult = z.infer<typeof lookupResultSchema>;
export type ChecklistResult = z.infer<typeof checklistResultSchema>;

export function successSource(toolId: string): ToolSource {
  return {
    toolId,
    status: 'success',
  };
}
