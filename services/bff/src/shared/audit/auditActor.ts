import type { ResolvedAuthzContext } from '../auth/authzContext.js';
import type { ScreenAccessActor } from './screenAccessEventBuilder.js';

export function buildScreenAccessActor(context: ResolvedAuthzContext): ScreenAccessActor {
  return {
    id: context.payload.user.id,
    subject: context.payload.user.subject,
    email: context.payload.user.email,
    name: context.payload.user.name,
    roles: context.payload.roles,
    authProvider: 'ecad-authz',
  };
}
