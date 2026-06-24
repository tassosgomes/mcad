export const DASHBOARD_PERMISSIONS = {
  cadastro: 'cadastro:default:associacao:listar',
  identificacao: 'identificacao:default:captacao:listar',
  arrecadacao: 'arrecadacao:default:cliente:listar',
  distribuicaoRubrica: 'distribuicao:default:rubrica:listar',
  distribuicaoProcesso: 'distribuicao:default:processo:listar',
} as const;

export function hasDashboardPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}

export function resolveDashboardAccess(permissions: string[]) {
  return {
    cadastro: hasDashboardPermission(permissions, DASHBOARD_PERMISSIONS.cadastro),
    identificacao: hasDashboardPermission(permissions, DASHBOARD_PERMISSIONS.identificacao),
    arrecadacao: hasDashboardPermission(permissions, DASHBOARD_PERMISSIONS.arrecadacao),
    distribuicao:
      hasDashboardPermission(permissions, DASHBOARD_PERMISSIONS.distribuicaoRubrica)
      || hasDashboardPermission(permissions, DASHBOARD_PERMISSIONS.distribuicaoProcesso),
  };
}
