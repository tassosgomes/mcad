export const AUDITORIA_PERMISSIONS = {
  catalogView: 'auditoria:default:catalogo:visualizar',
  eventList: 'auditoria:default:evento:listar',
  snapshotView: 'auditoria:default:snapshot:visualizar',
} as const;

export type AuditoriaPermission = typeof AUDITORIA_PERMISSIONS[keyof typeof AUDITORIA_PERMISSIONS];
