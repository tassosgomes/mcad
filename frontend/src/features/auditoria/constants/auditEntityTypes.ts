export const AUDIT_HISTORY_PERMISSIONS = [
  'cadastro:default:status:visualizar-historico-obra',
  'cadastro:default:status:visualizar-historico-fonograma',
  'identificacao:default:captacao:listar',
  'arrecadacao:default:cliente:listar',
  'authz:admin:audit:visualizar',
] as const;

export const auditEntityTypes = {
  associacao: 'Associacao',
  titular: 'Titular',
  obra: 'ObraMusical',
  fonograma: 'Fonograma',
  participacao: 'ParticipacaoConexa',
  titularidade: 'TitularidadeAutoral',
  usuarioMusica: 'UsuarioMusica',
  licenca: 'Licenca',
  pagamento: 'Pagamento',
  uda: 'Uda',
  captacao: 'Captacao',
  execucao: 'Execucao',
  upload: 'Upload',
  pendente: 'Pendente',
  rubrica: 'Rubrica',
  credito: 'Credito',
} as const;

export type AuditEntityType = typeof auditEntityTypes[keyof typeof auditEntityTypes];

export const auditEntityTypeOptions = [
  { value: auditEntityTypes.associacao, label: 'Associação' },
  { value: auditEntityTypes.titular, label: 'Titular' },
  { value: auditEntityTypes.obra, label: 'Obra musical' },
  { value: auditEntityTypes.fonograma, label: 'Fonograma' },
  { value: auditEntityTypes.participacao, label: 'Participação' },
  { value: auditEntityTypes.titularidade, label: 'Titularidade' },
  { value: auditEntityTypes.usuarioMusica, label: 'Usuário de música' },
  { value: auditEntityTypes.licenca, label: 'Licença' },
  { value: auditEntityTypes.pagamento, label: 'Pagamento' },
  { value: auditEntityTypes.uda, label: 'UDA' },
  { value: auditEntityTypes.captacao, label: 'Captação' },
  { value: auditEntityTypes.execucao, label: 'Execução' },
  { value: auditEntityTypes.upload, label: 'Upload' },
  { value: auditEntityTypes.pendente, label: 'Pendente' },
  { value: auditEntityTypes.rubrica, label: 'Rubrica' },
  { value: auditEntityTypes.credito, label: 'Crédito' },
] as const;
