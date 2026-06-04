import { AUDITORIA_PERMISSIONS } from '@shared/auth/auditoriaPermissions';

export const AUDIT_HISTORY_PERMISSIONS = [
  AUDITORIA_PERMISSIONS.eventList,
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

export interface AuditEntityOption {
  value: string;
  label: string;
  domain: 'Cadastro' | 'Identificação' | 'Arrecadação' | 'Distribuição';
}

export const auditEntityTypeOptions: AuditEntityOption[] = [
  { value: auditEntityTypes.associacao, label: 'Associação', domain: 'Cadastro' },
  { value: auditEntityTypes.titular, label: 'Titular', domain: 'Cadastro' },
  { value: auditEntityTypes.obra, label: 'Obra musical', domain: 'Cadastro' },
  { value: auditEntityTypes.fonograma, label: 'Fonograma', domain: 'Cadastro' },
  { value: auditEntityTypes.participacao, label: 'Participação', domain: 'Cadastro' },
  { value: auditEntityTypes.titularidade, label: 'Titularidade', domain: 'Cadastro' },
  { value: auditEntityTypes.captacao, label: 'Captação', domain: 'Identificação' },
  { value: auditEntityTypes.execucao, label: 'Execução', domain: 'Identificação' },
  { value: auditEntityTypes.upload, label: 'Upload', domain: 'Identificação' },
  { value: auditEntityTypes.pendente, label: 'Pendente', domain: 'Identificação' },
  { value: auditEntityTypes.usuarioMusica, label: 'Usuário de música', domain: 'Arrecadação' },
  { value: auditEntityTypes.licenca, label: 'Licença', domain: 'Arrecadação' },
  { value: auditEntityTypes.pagamento, label: 'Pagamento', domain: 'Arrecadação' },
  { value: auditEntityTypes.uda, label: 'UDA', domain: 'Arrecadação' },
  { value: auditEntityTypes.rubrica, label: 'Rubrica', domain: 'Distribuição' },
  { value: auditEntityTypes.credito, label: 'Crédito', domain: 'Distribuição' },
];

const ENTITY_LABEL_BY_VALUE = new Map(
  auditEntityTypeOptions.map((option) => [option.value, option.label]),
);

export function formatEntityType(value?: string | null): string {
  if (!value) return '—';
  return ENTITY_LABEL_BY_VALUE.get(value) ?? value;
}
