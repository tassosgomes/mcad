import { useMemo, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import type { AuditCatalogItem, AuditLevel } from '../types/audit-event';
import { useAuditCatalog } from '../hooks/useAuditCatalog';
import styles from './AuditPage.module.css';

type CatalogDomain = AuditCatalogItem['domain'] | '';
type CatalogLevel = AuditLevel | '';

interface CatalogFilters {
  domain: CatalogDomain;
  level: CatalogLevel;
  search: string;
}

const DOMAIN_LABELS: Record<AuditCatalogItem['domain'], string> = {
  cadastro: 'Cadastro',
  identificacao: 'Identificação',
  arrecadacao: 'Arrecadação',
  distribuicao: 'Distribuição',
  auditoria: 'Auditoria',
};

const LEVEL_LABELS: Record<AuditLevel, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
};

const LEVEL_BADGE_VARIANTS: Record<AuditLevel, 'muted' | 'secondary' | 'warning'> = {
  BRONZE: 'muted',
  SILVER: 'secondary',
  GOLD: 'warning',
};

const INITIAL_FILTERS: CatalogFilters = {
  domain: '',
  level: '',
  search: '',
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matchesSearch(item: AuditCatalogItem, search: string): boolean {
  if (!search.trim()) return true;

  const normalizedSearch = normalizeText(search);
  const searchable = [
    item.friendlyName,
    item.domain,
    item.level,
    item.justification,
    item.id,
    ...item.aliases,
  ].join(' ');

  return normalizeText(searchable).includes(normalizedSearch);
}

export function AuditCatalogPage() {
  const [filters, setFilters] = useState<CatalogFilters>(INITIAL_FILTERS);
  const catalogQuery = useAuditCatalog();

  const items = catalogQuery.data?.items ?? [];
  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        (filters.domain ? item.domain === filters.domain : true)
        && (filters.level ? item.level === filters.level : true)
        && matchesSearch(item, filters.search),
      ),
    [filters, items],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Catálogo de auditoria"
        description="Consulte quais telas são Bronze, Prata ou Ouro e por que cada classificação existe."
      />

      <section className={styles.filterCard} aria-label="Filtros do catálogo">
        <div className={styles.filterRow}>
          <div className={styles.field}>
            <label htmlFor="catalog-search">Buscar</label>
            <div className={styles.inputWithIcon}>
              <Search size={16} aria-hidden="true" />
              <input
                id="catalog-search"
                className={styles.input}
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, search: event.target.value }))
                }
                placeholder="Nome, justificativa ou alias"
              />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="catalog-domain">Domínio</label>
            <select
              id="catalog-domain"
              className={styles.select}
              value={filters.domain}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, domain: event.target.value as CatalogDomain }))
              }
            >
              <option value="">Todos os domínios</option>
              {Object.entries(DOMAIN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="catalog-level">Nível</label>
            <select
              id="catalog-level"
              className={styles.select}
              value={filters.level}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, level: event.target.value as CatalogLevel }))
              }
            >
              <option value="">Todos os níveis</option>
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {catalogQuery.isLoading && <Loading />}

      {catalogQuery.isError && (
        <div className={styles.errorState}>
          Não conseguimos carregar o catálogo agora. Tente novamente em alguns instantes.
        </div>
      )}

      {catalogQuery.data && filteredItems.length === 0 && (
        <div className={styles.emptyState}>
          <strong>Nenhuma tela encontrada.</strong>
          <p>Revise o texto de busca ou remova filtros de domínio e nível.</p>
        </div>
      )}

      {catalogQuery.data && filteredItems.length > 0 && (
        <>
          <div className={styles.tableHeader}>
            <span className={styles.resultsCount}>
              {filteredItems.length} {filteredItems.length === 1 ? 'tela classificada' : 'telas classificadas'}
            </span>
            <span className={styles.criteriaSummary}>
              Versão do catálogo: {catalogQuery.data.version}
            </span>
          </div>

          <div className={styles.catalogGrid}>
            {filteredItems.map((item) => (
              <article key={item.id} className={styles.catalogItem}>
                <header className={styles.catalogHeader}>
                  <div>
                    <span className={styles.secondaryText}>{DOMAIN_LABELS[item.domain]}</span>
                    <h2>{item.friendlyName}</h2>
                  </div>
                  <Badge variant={LEVEL_BADGE_VARIANTS[item.level]}>
                    {LEVEL_LABELS[item.level]}
                  </Badge>
                </header>
                <p className={styles.catalogJustification}>{item.justification}</p>
                <dl className={styles.catalogMeta}>
                  <div>
                    <dt>ID</dt>
                    <dd>{item.id}</dd>
                  </div>
                  <div>
                    <dt>Retenção</dt>
                    <dd>{item.retentionDays ? `${item.retentionDays} dias` : 'Conforme alteração de dados'}</dd>
                  </div>
                  <div>
                    <dt>Rotas</dt>
                    <dd>{item.routePatterns.join(', ')}</dd>
                  </div>
                  <div>
                    <dt>Aliases</dt>
                    <dd>{item.aliases.length > 0 ? item.aliases.join(', ') : '—'}</dd>
                  </div>
                </dl>
                {item.level === 'GOLD' && (
                  <div className={styles.goldNotice}>
                    <ShieldCheck size={16} aria-hidden="true" />
                    Snapshot somente para usuários com permissão forte de auditoria.
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
