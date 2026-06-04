export interface ScreenCatalogEntry {
  screenId: string;
  label: string;
  domain: 'Cadastro' | 'Identificação' | 'Arrecadação' | 'Distribuição' | 'Autorização' | 'Auditoria';
}

/**
 * Catálogo das telas conhecidas, com nome amigável para o auditor. A coluna
 * `screenId` segue a convenção dot-notation usada pelos serviços ao registrar
 * SCREEN_ACCESS. Telas não listadas continuam acessíveis via "Outra tela
 * (avançado)" no filtro.
 */
export const screenCatalog: ScreenCatalogEntry[] = [
  // Cadastro
  { screenId: 'cadastro.associacoes.lista', label: 'Cadastro · Associações', domain: 'Cadastro' },
  { screenId: 'cadastro.titulares.lista', label: 'Cadastro · Titulares', domain: 'Cadastro' },
  { screenId: 'cadastro.obras.lista', label: 'Cadastro · Obras', domain: 'Cadastro' },
  { screenId: 'cadastro.obras.detalhe', label: 'Cadastro · Detalhe de obra', domain: 'Cadastro' },
  { screenId: 'cadastro.fonogramas.lista', label: 'Cadastro · Fonogramas', domain: 'Cadastro' },
  { screenId: 'cadastro.fonogramas.detalhe', label: 'Cadastro · Detalhe de fonograma', domain: 'Cadastro' },
  { screenId: 'cadastro.participacoes.lista', label: 'Cadastro · Participações', domain: 'Cadastro' },
  { screenId: 'cadastro.titularidades.lista', label: 'Cadastro · Titularidades', domain: 'Cadastro' },

  // Identificação
  { screenId: 'identificacao.captacoes.lista', label: 'Identificação · Captações', domain: 'Identificação' },
  { screenId: 'identificacao.captacoes.detalhe', label: 'Identificação · Detalhe de captação', domain: 'Identificação' },
  { screenId: 'identificacao.pendentes.lista', label: 'Identificação · Pendentes', domain: 'Identificação' },

  // Arrecadação
  { screenId: 'arrecadacao.usuarios-musica.lista', label: 'Arrecadação · Usuários de música', domain: 'Arrecadação' },
  { screenId: 'arrecadacao.licencas.lista', label: 'Arrecadação · Licenças', domain: 'Arrecadação' },
  { screenId: 'arrecadacao.pagamentos.lista', label: 'Arrecadação · Pagamentos', domain: 'Arrecadação' },
  { screenId: 'arrecadacao.verbas.lista', label: 'Arrecadação · Verbas', domain: 'Arrecadação' },
  { screenId: 'arrecadacao.uda.lista', label: 'Arrecadação · UDA', domain: 'Arrecadação' },

  // Distribuição
  { screenId: 'distribuicao.rubricas.lista', label: 'Distribuição · Rubricas', domain: 'Distribuição' },
  { screenId: 'distribuicao.processos.lista', label: 'Distribuição · Processos', domain: 'Distribuição' },
  { screenId: 'distribuicao.processos.detalhe', label: 'Distribuição · Detalhe de processo', domain: 'Distribuição' },

  // Autorização
  { screenId: 'autorizacao.papeis.lista', label: 'Autorização · Papéis & Acessos', domain: 'Autorização' },
  { screenId: 'autorizacao.permissoes.lista', label: 'Autorização · Permissões', domain: 'Autorização' },
  { screenId: 'autorizacao.meu-dominio', label: 'Autorização · Meu domínio', domain: 'Autorização' },

  // Auditoria
  { screenId: 'auditoria.eventos.lista', label: 'Auditoria · Histórico de alterações', domain: 'Auditoria' },
  { screenId: 'auditoria.acessos.lista', label: 'Auditoria · Acessos a telas', domain: 'Auditoria' },
  { screenId: 'auditoria.relatorios.lista', label: 'Auditoria · Relatórios', domain: 'Auditoria' },
];

const SCREEN_LABEL_BY_ID = new Map(screenCatalog.map((entry) => [entry.screenId, entry.label]));

export function formatScreenLabel(screenId?: string | null, screenName?: string | null): string {
  if (!screenId && !screenName) return '—';
  if (screenId && SCREEN_LABEL_BY_ID.has(screenId)) {
    return SCREEN_LABEL_BY_ID.get(screenId)!;
  }
  return screenName ?? screenId ?? '—';
}

export function getScreenDomain(screenId?: string | null): string | undefined {
  if (!screenId) return undefined;
  const entry = screenCatalog.find((s) => s.screenId === screenId);
  return entry?.domain;
}
