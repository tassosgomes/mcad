export const ACESSOS_PERMISSIONS = {
  fullList: 'acessos:default:papel:listar',
  listUsers: 'acessos:default:usuario:listar',
  assign: 'acessos:default:papel:atribuir',
  remove: 'acessos:default:papel:remover',
} as const;

const SCOPED_VIEW_PERMISSION = /^acessos:([a-z-]+):papel:visualizar$/;

export interface ScopedAccess {
  allDomains: boolean;
  scoped: string[];
}

export function deriveScopedDomains(permissions: string[]): ScopedAccess {
  if (permissions.includes(ACESSOS_PERMISSIONS.fullList)) {
    return { allDomains: true, scoped: [] };
  }

  const scoped = permissions
    .map((permission) => SCOPED_VIEW_PERMISSION.exec(permission)?.[1])
    .filter((domain): domain is string => Boolean(domain) && domain !== 'default');

  return { allDomains: false, scoped: [...new Set(scoped)] };
}

export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}
