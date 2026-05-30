import { RuntimeContext } from '@mastra/core/runtime-context';
import { z } from 'zod';

export const mcadRuntimeContextSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().optional(),
  permissions: z.array(z.string()),
  authzVersion: z.number().int().nonnegative(),
  accessToken: z.string().min(1),
  requestId: z.string().min(1),
  locale: z.literal('pt-BR'),
  environment: z.enum(['local', 'dev', 'prod']),
});

export const resolvedRuntimeAuthorizationSchema = mcadRuntimeContextSchema.pick({
  userId: true,
  displayName: true,
  permissions: true,
  authzVersion: true,
});

export type ResolvedRuntimeAuthorization = z.infer<typeof resolvedRuntimeAuthorizationSchema>;
export type McadRuntimeContextValues = z.infer<typeof mcadRuntimeContextSchema>;
export type McadRuntimeContext = RuntimeContext<McadRuntimeContextValues>;

export function createRuntimeContext(values: McadRuntimeContextValues): McadRuntimeContext {
  const parsedValues = mcadRuntimeContextSchema.parse(values);
  const runtimeContext = new RuntimeContext<McadRuntimeContextValues>();

  runtimeContext.set('userId', parsedValues.userId);
  if (parsedValues.displayName) {
    runtimeContext.set('displayName', parsedValues.displayName);
  }
  runtimeContext.set('permissions', parsedValues.permissions);
  runtimeContext.set('authzVersion', parsedValues.authzVersion);
  runtimeContext.set('accessToken', parsedValues.accessToken);
  runtimeContext.set('requestId', parsedValues.requestId);
  runtimeContext.set('locale', parsedValues.locale);
  runtimeContext.set('environment', parsedValues.environment);

  return runtimeContext;
}

export function runtimeContextToObject(runtimeContext: McadRuntimeContext): McadRuntimeContextValues {
  return mcadRuntimeContextSchema.parse(runtimeContext.toJSON());
}
