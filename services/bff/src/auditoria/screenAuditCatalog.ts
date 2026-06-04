export type AuditLevel = 'BRONZE' | 'SILVER' | 'GOLD';
export type AuditHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type AuditDomain = 'cadastro' | 'identificacao' | 'arrecadacao' | 'distribuicao' | 'auditoria';

export interface BusinessContextSourceRule {
  pathParams?: string[];
  queryParams?: string[];
}

export interface BusinessContextRule {
  entityType?: string;
  entityId?: BusinessContextSourceRule;
  businessCode?: BusinessContextSourceRule;
  filterParams: 'all' | string[];
  paginationParams: {
    page: string[];
    size: string[];
  };
  sortingParams: string[];
}

export interface AuditScreenOperation {
  id: string;
  aliases: string[];
  domain: AuditDomain;
  friendlyName: string;
  routePatterns: string[];
  methods: AuditHttpMethod[];
  level: AuditLevel;
  justification: string;
  owner: string;
  approvedBy: string;
  approvedAt: string;
  changeReason: string;
  businessContext: BusinessContextRule;
  retentionDays: number;
}

export interface CatalogRouteMethodRule {
  operationId: string;
  routePattern: string;
  method: AuditHttpMethod;
}

export const AUDIT_CATALOG_VERSION = '2026-06-04.prd-auditoria-telas.task-1';
export const AUDIT_RETENTION_DAYS = 90;
export const BRONZE_RETENTION_DAYS = 0;
export const CATALOG_GOVERNANCE_NOTE =
  'Audit screen catalog changes are made only through pull request, code review and deploy; Git history is the traceability source for approval metadata changes.';
export const SILVER_CLASSIFICATION_PENDING_REVIEW_NOTE =
  'Initial SILVER entries are based on the current MCAD screen catalog and must be revisited by Product/Compliance when the official SILVER list is published.';

const defaultPaginationParams = {
  page: ['page', 'pagina'],
  size: ['size', 'limit', 'limite'],
} satisfies BusinessContextRule['paginationParams'];

function contextRule(
  entityType: string | undefined,
  options: {
    entityIdPathParams?: string[];
    entityIdQueryParams?: string[];
    businessCodePathParams?: string[];
    businessCodeQueryParams?: string[];
    filterParams?: 'all' | string[];
    sortingParams?: string[];
  } = {},
): BusinessContextRule {
  return {
    entityType,
    entityId: {
      pathParams: options.entityIdPathParams ?? ['id'],
      queryParams: options.entityIdQueryParams ?? ['id', `${entityType ?? 'entity'}Id`],
    },
    businessCode: {
      pathParams: options.businessCodePathParams ?? [],
      queryParams: options.businessCodeQueryParams ?? ['codigo', 'code', 'numero', 'sigla', 'periodo'],
    },
    filterParams: options.filterParams ?? 'all',
    paginationParams: defaultPaginationParams,
    sortingParams: options.sortingParams ?? ['sort', 'orderBy', 'ordenacao'],
  };
}

function goldOperation(
  operation: Omit<AuditScreenOperation, 'level' | 'retentionDays' | 'owner' | 'approvedBy' | 'approvedAt' | 'changeReason'>,
): AuditScreenOperation {
  return {
    ...operation,
    level: 'GOLD',
    owner: 'Produto MCAD',
    approvedBy: 'Produto/Compliance MCAD',
    approvedAt: '2026-06-04',
    changeReason: 'Classificacao Ouro inicial obrigatoria definida pelo PRD de auditoria de telas.',
    retentionDays: AUDIT_RETENTION_DAYS,
  };
}

function silverOperation(
  operation: Omit<AuditScreenOperation, 'level' | 'retentionDays' | 'owner' | 'approvedBy' | 'approvedAt' | 'changeReason'>,
): AuditScreenOperation {
  return {
    ...operation,
    level: 'SILVER',
    owner: 'Produto MCAD',
    approvedBy: 'Produto/Compliance MCAD',
    approvedAt: '2026-06-04',
    changeReason: SILVER_CLASSIFICATION_PENDING_REVIEW_NOTE,
    retentionDays: AUDIT_RETENTION_DAYS,
  };
}

function bronzeOperation(
  operation: Omit<AuditScreenOperation, 'level' | 'retentionDays' | 'owner' | 'approvedBy' | 'approvedAt' | 'changeReason'>,
): AuditScreenOperation {
  return {
    ...operation,
    level: 'BRONZE',
    owner: 'Produto MCAD',
    approvedBy: 'Produto MCAD',
    approvedAt: '2026-06-04',
    changeReason: 'Classificacao Bronze inicial para tela sem criterio de leitura sensivel na V1.',
    retentionDays: BRONZE_RETENTION_DAYS,
  };
}

/**
 * Governed audit catalog. Do not update at runtime or through administrative UI.
 * Every classification change must be reviewed in a PR and deployed so Git keeps
 * the approval trail for owner, approver, date, reason and business context.
 */
export const screenAuditCatalog: readonly AuditScreenOperation[] = [
  goldOperation({
    id: 'cadastro.titulares.lista',
    aliases: ['CADASTRO_TITULARES'],
    domain: 'cadastro',
    friendlyName: 'Cadastro - Titulares',
    routePatterns: ['/api/cadastro/v1/titulares', '/api/cadastro/v1/titulares/:id'],
    methods: ['GET'],
    justification: 'Consulta obrigatoria Ouro por expor dados pessoais de titulares e exigir snapshot fiel para investigacao de vazamento.',
    businessContext: contextRule('Titular', {
      entityIdQueryParams: ['id', 'titularId'],
      businessCodeQueryParams: ['cpfCnpj', 'documento', 'nome', 'codigo'],
    }),
  }),
  silverOperation({
    id: 'cadastro.obras.lista',
    aliases: ['CADASTRO_OBRAS'],
    domain: 'cadastro',
    friendlyName: 'Cadastro - Obras',
    routePatterns: ['/api/cadastro/v1/obras', '/api/cadastro/v1/obras/:id'],
    methods: ['GET'],
    justification: 'Consulta de obras pode expor titulares, titularidades e contexto autoral de terceiros.',
    businessContext: contextRule('ObraMusical', {
      entityIdQueryParams: ['id', 'obraId'],
      businessCodeQueryParams: ['iswc', 'titulo', 'codigo'],
    }),
  }),
  silverOperation({
    id: 'cadastro.fonogramas.lista',
    aliases: ['CADASTRO_FONOGRAMAS'],
    domain: 'cadastro',
    friendlyName: 'Cadastro - Fonogramas',
    routePatterns: ['/api/cadastro/v1/fonogramas', '/api/cadastro/v1/fonogramas/:id'],
    methods: ['GET'],
    justification: 'Consulta de fonogramas pode expor obras, produtores, interpretes e dados de terceiros.',
    businessContext: contextRule('Fonograma', {
      entityIdQueryParams: ['id', 'fonogramaId'],
      businessCodeQueryParams: ['isrc', 'titulo', 'codigo'],
    }),
  }),
  silverOperation({
    id: 'cadastro.participacoes.lista',
    aliases: ['CADASTRO_PARTICIPACOES'],
    domain: 'cadastro',
    friendlyName: 'Cadastro - Participacoes',
    routePatterns: ['/api/cadastro/v1/participacoes', '/api/cadastro/v1/participacoes/:id'],
    methods: ['GET'],
    justification: 'Consulta de participacoes pode expor relacoes de titulares e percentuais de terceiros.',
    businessContext: contextRule('Participacao', {
      entityIdQueryParams: ['id', 'participacaoId', 'titularId', 'obraId', 'fonogramaId'],
    }),
  }),
  silverOperation({
    id: 'cadastro.titularidades.lista',
    aliases: ['CADASTRO_TITULARIDADES'],
    domain: 'cadastro',
    friendlyName: 'Cadastro - Titularidades',
    routePatterns: ['/api/cadastro/v1/titularidades', '/api/cadastro/v1/titularidades/:id'],
    methods: ['GET'],
    justification: 'Consulta de titularidades pode expor titulares, percentuais e relacoes autorais sensiveis.',
    businessContext: contextRule('TitularidadeAutoral', {
      entityIdQueryParams: ['id', 'titularidadeId', 'titularId', 'obraId'],
    }),
  }),
  bronzeOperation({
    id: 'cadastro.associacoes.lista',
    aliases: ['CADASTRO_ASSOCIACOES'],
    domain: 'cadastro',
    friendlyName: 'Cadastro - Associacoes',
    routePatterns: ['/api/cadastro/v1/associacoes', '/api/cadastro/v1/associacoes/:id'],
    methods: ['GET'],
    justification: 'Tela institucional sem snapshot ou metadados de leitura sensivel definidos para a V1.',
    businessContext: contextRule('Associacao', {
      entityIdQueryParams: ['id', 'associacaoId'],
      businessCodeQueryParams: ['sigla', 'codigo'],
    }),
  }),
  silverOperation({
    id: 'identificacao.captacoes.lista',
    aliases: ['IDENTIFICACAO_CAPTACOES'],
    domain: 'identificacao',
    friendlyName: 'Identificacao - Captacoes',
    routePatterns: ['/api/identificacao/v1/captacoes', '/api/identificacao/v1/captacoes/:id'],
    methods: ['GET'],
    justification: 'Consulta de captacoes pode expor execucoes, obras, fonogramas e correlacoes de terceiros.',
    businessContext: contextRule('Captacao', {
      entityIdQueryParams: ['id', 'captacaoId'],
      businessCodeQueryParams: ['codigo', 'periodo', 'fonte'],
    }),
  }),
  silverOperation({
    id: 'identificacao.pendentes.lista',
    aliases: ['IDENTIFICACAO_PENDENTES'],
    domain: 'identificacao',
    friendlyName: 'Identificacao - Pendentes',
    routePatterns: ['/api/identificacao/v1/pendentes', '/api/identificacao/v1/pendentes/:id'],
    methods: ['GET'],
    justification: 'Consulta de pendencias pode expor resultados de identificacao e vinculos com obras ou fonogramas.',
    businessContext: contextRule('PendenteIdentificacao', {
      entityIdQueryParams: ['id', 'pendenteId', 'captacaoId'],
    }),
  }),
  silverOperation({
    id: 'arrecadacao.usuarios-musica.lista',
    aliases: ['ARRECADACAO_USUARIOS_MUSICA'],
    domain: 'arrecadacao',
    friendlyName: 'Arrecadacao - Usuarios de musica',
    routePatterns: ['/api/arrecadacao/v1/usuarios-musica', '/api/arrecadacao/v1/usuarios-musica/:id'],
    methods: ['GET'],
    justification: 'Consulta de usuarios de musica pode expor dados cadastrais e comerciais de terceiros.',
    businessContext: contextRule('UsuarioMusica', {
      entityIdQueryParams: ['id', 'usuarioMusicaId'],
      businessCodeQueryParams: ['cpfCnpj', 'documento', 'razaoSocial', 'codigo'],
    }),
  }),
  silverOperation({
    id: 'arrecadacao.licencas.lista',
    aliases: ['ARRECADACAO_LICENCAS'],
    domain: 'arrecadacao',
    friendlyName: 'Arrecadacao - Licencas',
    routePatterns: ['/api/arrecadacao/v1/licencas', '/api/arrecadacao/v1/licencas/:id'],
    methods: ['GET'],
    justification: 'Consulta de licencas pode expor contratos, usuarios de musica e valores comerciais.',
    businessContext: contextRule('Licenca', {
      entityIdQueryParams: ['id', 'licencaId', 'usuarioMusicaId'],
      businessCodeQueryParams: ['numero', 'codigo', 'periodo'],
    }),
  }),
  goldOperation({
    id: 'arrecadacao.pagamentos.lista',
    aliases: ['ARRECADACAO_PAGAMENTOS'],
    domain: 'arrecadacao',
    friendlyName: 'Arrecadacao - Pagamentos',
    routePatterns: ['/api/arrecadacao/v1/pagamentos', '/api/arrecadacao/v1/pagamentos/:id'],
    methods: ['GET'],
    justification: 'Consulta obrigatoria Ouro por expor pagamentos, valores financeiros e dados de terceiros com necessidade de snapshot.',
    businessContext: contextRule('Pagamento', {
      entityIdQueryParams: ['id', 'pagamentoId', 'licencaId', 'usuarioMusicaId'],
      businessCodeQueryParams: ['numero', 'codigo', 'periodo', 'status'],
    }),
  }),
  goldOperation({
    id: 'arrecadacao.verbas.lista',
    aliases: ['ARRECADACAO_VERBAS'],
    domain: 'arrecadacao',
    friendlyName: 'Arrecadacao - Verbas',
    routePatterns: [
      '/api/arrecadacao/v1/verbas',
      '/api/arrecadacao/v1/verbas/agregado-por-rubrica',
      '/api/arrecadacao/v1/verbas/:rubricaSigla/:periodo',
    ],
    methods: ['GET'],
    justification: 'Consulta obrigatoria Ouro por expor verbas, rubricas, periodo e valores financeiros com necessidade de snapshot.',
    businessContext: contextRule('Verba', {
      entityIdPathParams: ['rubricaSigla'],
      businessCodePathParams: ['rubricaSigla', 'periodo'],
      entityIdQueryParams: ['id', 'verbaId', 'rubricaId'],
      businessCodeQueryParams: ['rubricaSigla', 'periodo', 'status'],
    }),
  }),
  silverOperation({
    id: 'arrecadacao.uda.lista',
    aliases: ['ARRECADACAO_UDA'],
    domain: 'arrecadacao',
    friendlyName: 'Arrecadacao - UDA',
    routePatterns: ['/api/arrecadacao/v1/uda', '/api/arrecadacao/v1/uda/:id'],
    methods: ['GET'],
    justification: 'Consulta de UDA pode expor dados de arrecadacao e relacoes comerciais de terceiros.',
    businessContext: contextRule('UnidadeDeArrecadacao', {
      entityIdQueryParams: ['id', 'udaId'],
      businessCodeQueryParams: ['codigo', 'sigla', 'nome'],
    }),
  }),
  bronzeOperation({
    id: 'distribuicao.rubricas.lista',
    aliases: ['DISTRIBUICAO_RUBRICAS'],
    domain: 'distribuicao',
    friendlyName: 'Distribuicao - Rubricas',
    routePatterns: ['/api/distribuicao/v1/rubricas', '/api/distribuicao/v1/rubricas/:id'],
    methods: ['GET'],
    justification: 'Catalogo operacional de rubricas sem captura de leitura sensivel definida para a V1.',
    businessContext: contextRule('Rubrica', {
      entityIdQueryParams: ['id', 'rubricaId'],
      businessCodeQueryParams: ['sigla', 'codigo'],
    }),
  }),
  silverOperation({
    id: 'distribuicao.processos.lista',
    aliases: ['DISTRIBUICAO_PROCESSOS'],
    domain: 'distribuicao',
    friendlyName: 'Distribuicao - Processos',
    routePatterns: ['/api/distribuicao/v1/processos', '/api/distribuicao/v1/processos/disponiveis'],
    methods: ['GET'],
    justification: 'Consulta de processos pode expor contexto financeiro de distribuicao e creditos de titulares.',
    businessContext: contextRule('ProcessoDistribuicao', {
      entityIdQueryParams: ['id', 'processoId'],
      businessCodeQueryParams: ['competencia', 'rubrica', 'status'],
    }),
  }),
  silverOperation({
    id: 'distribuicao.processos.detalhe',
    aliases: ['DISTRIBUICAO_PROCESSOS_DETALHE'],
    domain: 'distribuicao',
    friendlyName: 'Distribuicao - Detalhe de processo',
    routePatterns: [
      '/api/distribuicao/v1/processos/:id',
      '/api/distribuicao/v1/processos/:id/calculo',
      '/api/distribuicao/processos/:id/historico',
    ],
    methods: ['GET'],
    justification: 'Detalhe do processo pode expor calculos, status, rubricas e creditos associados.',
    businessContext: contextRule('ProcessoDistribuicao', {
      entityIdPathParams: ['id'],
      businessCodeQueryParams: ['categoria', 'titularId', 'obraId', 'status', 'motivoRetencao'],
    }),
  }),
  silverOperation({
    id: 'auditoria.eventos.lista',
    aliases: ['AUDITORIA_EVENTOS'],
    domain: 'auditoria',
    friendlyName: 'Auditoria - Historico de alteracoes',
    routePatterns: ['/api/auditoria/v1/audit/events', '/api/auditoria/v1/audit/events/:eventId'],
    methods: ['GET'],
    justification: 'Consulta de eventos de auditoria expõe trilhas de acesso, alteracao e contexto de negocio.',
    businessContext: contextRule('AuditEvent', {
      entityIdPathParams: ['eventId'],
      entityIdQueryParams: ['eventId', 'entityId', 'actorUserId', 'screenId'],
    }),
  }),
  silverOperation({
    id: 'auditoria.acessos.lista',
    aliases: ['AUDITORIA_ACESSOS'],
    domain: 'auditoria',
    friendlyName: 'Auditoria - Acessos a telas',
    routePatterns: ['/api/auditoria/v1/audit/screen-access'],
    methods: ['GET'],
    justification: 'Consulta de acessos a telas expõe usuarios, telas e contexto de investigacao.',
    businessContext: contextRule('ScreenAccess', {
      entityIdQueryParams: ['screenAccessId', 'userId', 'screenId'],
    }),
  }),
  silverOperation({
    id: 'auditoria.relatorios.lista',
    aliases: ['AUDITORIA_RELATORIOS'],
    domain: 'auditoria',
    friendlyName: 'Auditoria - Relatorios',
    routePatterns: ['/api/auditoria/v1/audit/reports', '/api/auditoria/v1/audit/reports/:reportId'],
    methods: ['GET'],
    justification: 'Consulta de relatorios de auditoria pode expor filtros e resultados de investigacao.',
    businessContext: contextRule('AuditReport', {
      entityIdPathParams: ['reportId'],
      entityIdQueryParams: ['reportId', 'entityId', 'screenId'],
    }),
  }),
] as const;

export function getAuditCatalogRouteMethodRules(
  catalog: readonly AuditScreenOperation[] = screenAuditCatalog,
): CatalogRouteMethodRule[] {
  return catalog.flatMap((operation) =>
    operation.routePatterns.flatMap((routePattern) =>
      operation.methods.map((method) => ({
        operationId: operation.id,
        routePattern,
        method,
      })),
    ),
  );
}

export function findDuplicateRouteMethodRules(
  catalog: readonly AuditScreenOperation[] = screenAuditCatalog,
): CatalogRouteMethodRule[][] {
  const groups = new Map<string, CatalogRouteMethodRule[]>();

  for (const rule of getAuditCatalogRouteMethodRules(catalog)) {
    const key = `${rule.method} ${rule.routePattern}`;
    const existing = groups.get(key) ?? [];
    existing.push(rule);
    groups.set(key, existing);
  }

  return [...groups.values()].filter((rules) => rules.length > 1);
}
