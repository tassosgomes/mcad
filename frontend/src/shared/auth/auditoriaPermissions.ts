export const AUDITORIA_PERMISSIONS = {
  catalogView: 'auditoria:default:catalogo:visualizar',
  eventList: 'auditoria:default:evento:listar',
  snapshotView: 'auditoria:default:snapshot:visualizar',
} as const;

export const AUDITORIA_ROUTE_PERMISSIONS = [
  AUDITORIA_PERMISSIONS.catalogView,
  AUDITORIA_PERMISSIONS.eventList,
] as const;
