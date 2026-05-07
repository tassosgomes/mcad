const authorizedRouteByRole: Array<{ roles: string[]; path: string }> = [
  { roles: ['analista-cadastro', 'consultor'], path: '/cadastro/associacoes' },
  { roles: ['analista-identificacao', 'consultor-identificacao'], path: '/identificacao/captacoes' },
  { roles: ['analista-arrecadacao', 'consultor-arrecadacao'], path: '/arrecadacao/licencas' },
  { roles: ['analista-distribuicao', 'consultor-distribuicao'], path: '/distribuicao/rubricas' },
];

export function getDefaultAuthorizedPath(roles: string[]): string {
  const match = authorizedRouteByRole.find(({ roles: allowedRoles }) =>
    allowedRoles.some((role) => roles.includes(role))
  );

  return match?.path ?? '/cadastro/associacoes';
}

export function resolveAuthorizedReturnPath(returnUrl: string | null, roles: string[]): string {
  if (!returnUrl || returnUrl === '/') {
    return getDefaultAuthorizedPath(roles);
  }

  return returnUrl;
}