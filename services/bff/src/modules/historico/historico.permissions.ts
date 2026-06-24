export const VIEW_HISTORY_PERMISSION = 'distribuicao:default:processo:ver-historico-alteracoes';
const GLOBAL_ASSIGNMENT_HISTORY_PERMISSION = 'acessos:default:atribuicao:ver-historico';
const SCOPED_ASSIGNMENT_HISTORY_PERMISSION = /^acessos:([a-z-]+):atribuicao:ver-historico$/;

export interface AssignmentHistoryAccess {
  allDomains: boolean;
  scoped: string[];
}

export function roleDomainFromKey(roleKey: string): string {
  return roleKey.split('.')[0] ?? 'unknown';
}

export function deriveAssignmentHistoryDomains(permissions: string[]): AssignmentHistoryAccess {
  if (permissions.includes(GLOBAL_ASSIGNMENT_HISTORY_PERMISSION)) {
    return { allDomains: true, scoped: [] };
  }

  const scoped = permissions
    .map((permission) => SCOPED_ASSIGNMENT_HISTORY_PERMISSION.exec(permission)?.[1])
    .filter((domain): domain is string => Boolean(domain) && domain !== 'default');

  return { allDomains: false, scoped: [...new Set(scoped)] };
}
