const authorizedRouteByPermission: Array<{ permission: string; path: string }> = [
  { permission: 'cadastro:default:associacao:listar', path: '/cadastro/associacoes' },
  { permission: 'identificacao:default:captacao:listar', path: '/identificacao/captacoes' },
  { permission: 'arrecadacao:default:cliente:listar', path: '/arrecadacao/licencas' },
  { permission: 'distribuicao:default:rubrica:listar', path: '/distribuicao/rubricas' },
  { permission: 'distribuicao:default:processo:listar', path: '/distribuicao/processos' },
  { permission: 'authz:admin:role:visualizar', path: '/autorizacao/papeis' },
  { permission: 'acessos:default:papel:listar', path: '/autorizacao/papeis' },
];

export function getDefaultAuthorizedPath(permissions: readonly string[]): string {
  const match = authorizedRouteByPermission.find(({ permission }) => permissions.includes(permission));

  return match?.path ?? '/';
}

export function resolveAuthorizedReturnPath(
  returnUrl: string | null,
  permissions: readonly string[],
): string {
  if (!returnUrl || returnUrl === '/') {
    return getDefaultAuthorizedPath(permissions);
  }

  return returnUrl;
}
