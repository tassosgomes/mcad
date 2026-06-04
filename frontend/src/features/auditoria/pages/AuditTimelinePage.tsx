import { useMemo, useState } from 'react';
import { Download, Eye, RotateCcw, Search } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { Modal } from '@components/ui/modal';
import { PageHeader } from '@components/ui/page-header';
import { AuditEventDetailPanel } from '../components/AuditEventDetailPanel';
import { AuditEventTypeBadge } from '../components/AuditEventTypeBadge';
import { DEFAULT_PERIOD, PeriodPicker, resolvePeriod, type PeriodValue } from '../components/PeriodPicker';
import { ScreenSelect } from '../components/ScreenSelect';
import { UserAutocomplete, type SelectedUser } from '../components/UserAutocomplete';
import { auditEntityTypeOptions, formatEntityType } from '../constants/auditEntityTypes';
import { formatScreenLabel } from '../constants/screenCatalog';
import { useAuditEvents } from '../hooks/useAuditEvents';
import type { AuditEventListItem, AuditLevel } from '../types/audit-event';
import { downloadCsv } from '../utils/exportCsv';
import { formatAuditDate, formatAuditRelative, formatAuditValue, toIsoDateTime } from '../utils/auditFormatters';
import styles from './AuditPage.module.css';

interface EventFilters {
  user: SelectedUser | null;
  screenId: string;
  entityType: string;
  context: string;
  auditLevel: AuditLevel | '';
  period: PeriodValue;
}

const PAGE_SIZE = 20;

const LEVEL_LABELS: Record<AuditLevel, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
};

function buildInitialFilters(): EventFilters {
  return {
    user: null,
    screenId: '',
    entityType: '',
    context: '',
    auditLevel: '',
    period: { ...DEFAULT_PERIOD },
  };
}

function getAuditLevel(item: AuditEventListItem): AuditLevel | string | null {
  const level = item.screen?.auditLevel ?? item.catalog?.level ?? item.metadata?.auditLevel;
  return typeof level === 'string' && level ? level : null;
}

function formatAuditLevel(level: AuditLevel | string | null): string {
  if (!level) return '—';
  return LEVEL_LABELS[level as AuditLevel] ?? level;
}

function getBusinessContext(item: AuditEventListItem): Record<string, unknown> {
  const context = item.screen?.businessContext;
  return context && typeof context === 'object' && !Array.isArray(context) ? context : {};
}

function summarizeBusinessContext(item: AuditEventListItem): string {
  const dataEntity = item.data?.entityType
    ? `${formatEntityType(item.data.entityType)} ${item.data.entityId ?? ''}`.trim()
    : '';
  if (dataEntity) return dataEntity;

  const context = getBusinessContext(item);
  const candidates = [
    context.businessCode,
    context.entityId,
    context.entityType,
    context.codigo,
    context.code,
    context.documento,
  ];
  const first = candidates.find((value) => value !== undefined && value !== null && value !== '');

  return first === undefined ? '—' : formatAuditValue(first);
}

function summarizeEvent(item: AuditEventListItem): string {
  if (item.eventType === 'SCREEN_ACCESS') {
    return `Consulta em ${formatScreenLabel(item.screen?.screenId ?? item.origin?.screenId, item.screen?.screenName ?? item.origin?.screenName)}`;
  }

  return item.action?.label ?? item.action?.name ?? item.data?.action ?? item.eventType;
}

export function AuditTimelinePage() {
  const [filters, setFilters] = useState<EventFilters>(buildInitialFilters);
  const [submittedFilters, setSubmittedFilters] = useState<EventFilters | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const resolvedPeriod = useMemo(
    () => (submittedFilters ? resolvePeriod(submittedFilters.period) : null),
    [submittedFilters],
  );

  const query = useAuditEvents(
    {
      userId: submittedFilters?.user?.id,
      screenId: submittedFilters?.screenId || undefined,
      entityType: submittedFilters?.entityType || undefined,
      context: submittedFilters?.context || undefined,
      auditLevel: submittedFilters?.auditLevel,
      from: toIsoDateTime(resolvedPeriod?.from ?? ''),
      to: toIsoDateTime(resolvedPeriod?.to ?? ''),
      page: 0,
      size: PAGE_SIZE,
    },
    submittedFilters !== null,
  );
  const items = query.data?.items ?? [];
  const totalLabel =
    items.length === PAGE_SIZE
      ? `${PAGE_SIZE}+ resultados (refine o período para ver os mais antigos)`
      : `${items.length} ${items.length === 1 ? 'resultado' : 'resultados'}`;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedFilters(filters);
  };

  const handleReset = () => {
    setFilters(buildInitialFilters());
    setSubmittedFilters(null);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Eventos de auditoria"
        description="Filtre acessos e alterações por usuário, tela, período, contexto de negócio e nível de auditoria."
      />

      <form className={styles.filterCard} onSubmit={handleSubmit}>
        <div className={styles.filterRow}>
          <div className={styles.field}>
            <UserAutocomplete
              label="Usuário"
              value={filters.user}
              onChange={(user) => setFilters((prev) => ({ ...prev, user }))}
            />
          </div>
          <div className={styles.field}>
            <ScreenSelect
              label="Tela"
              value={filters.screenId}
              onChange={(screenId) => setFilters((prev) => ({ ...prev, screenId }))}
              placeholder="Todas as telas"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="entityType">Entidade</label>
            <select
              id="entityType"
              className={styles.select}
              value={filters.entityType}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, entityType: event.target.value }))
              }
            >
              <option value="">Todas as entidades</option>
              {Array.from(new Set(auditEntityTypeOptions.map((opt) => opt.domain))).map((domain) => (
                <optgroup key={domain} label={domain}>
                  {auditEntityTypeOptions
                    .filter((opt) => opt.domain === domain)
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="auditLevel">Nível</label>
            <select
              id="auditLevel"
              className={styles.select}
              value={filters.auditLevel}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, auditLevel: event.target.value as AuditLevel | '' }))
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
          <div className={styles.field}>
            <label htmlFor="businessContext">Contexto de negócio</label>
            <input
              id="businessContext"
              className={styles.input}
              value={filters.context}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, context: event.target.value }))
              }
              placeholder="Documento, código, número ou identificador"
            />
          </div>
        </div>
        <PeriodPicker
          value={filters.period}
          onChange={(period) => setFilters((prev) => ({ ...prev, period }))}
        />
        <div className={styles.filterActions}>
          <Button type="submit">
            <Search size={16} />
            Buscar eventos
          </Button>
          <Button type="button" variant="ghost" onClick={handleReset}>
            <RotateCcw size={16} />
            Limpar
          </Button>
        </div>
      </form>

      {!submittedFilters && (
        <div className={styles.zeroState}>
          <strong>Comece pelo período e refine quando necessário.</strong>
          <p>
            Os últimos 7 dias já vêm selecionados. Use usuário, tela, entidade, contexto ou nível para reduzir
            a investigação sem depender de identificadores técnicos.
          </p>
        </div>
      )}

      {query.isLoading && <Loading />}

      {query.isError && (
        <div className={styles.errorState}>
          Não conseguimos consultar os eventos agora. Tente novamente em alguns instantes.
        </div>
      )}

      {submittedFilters && query.data && items.length === 0 && (
        <div className={styles.emptyState}>
          <strong>Nenhum evento encontrado.</strong>
          <p>Tente ampliar o período ou remover algum filtro.</p>
        </div>
      )}

      {submittedFilters && query.data && items.length > 0 && (
        <>
          <div className={styles.tableHeader}>
            <span className={styles.resultsCount}>{totalLabel}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                downloadCsv(
                  `eventos-auditoria-${new Date().toISOString().slice(0, 10)}.csv`,
                  [
                    { header: 'Data', accessor: (item) => formatAuditDate(item.occurredAt) },
                    { header: 'Tipo', accessor: (item) => item.eventType },
                    { header: 'Nível', accessor: (item) => formatAuditLevel(getAuditLevel(item)) },
                    { header: 'Resumo', accessor: summarizeEvent },
                    { header: 'Usuário', accessor: (item) => item.actor?.displayName ?? item.actor?.username ?? item.actor?.userId ?? '' },
                    { header: 'Tela', accessor: (item) => formatScreenLabel(item.screen?.screenId ?? item.origin?.screenId, item.screen?.screenName ?? item.origin?.screenName) },
                    { header: 'Contexto', accessor: summarizeBusinessContext },
                    { header: 'ID do evento', accessor: (item) => item.eventId },
                  ],
                  items,
                )
              }
            >
              <Download size={14} />
              Exportar CSV
            </Button>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Quando</th>
                  <th className={styles.th}>Tipo</th>
                  <th className={styles.th}>Nível</th>
                  <th className={styles.th}>Evento</th>
                  <th className={styles.th}>Usuário</th>
                  <th className={styles.th}>Contexto</th>
                  <th className={styles.th} aria-label="Ações">
                    <span className={styles.visuallyHidden}>Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.eventId} className={styles.row}>
                    <td className={styles.td}>
                      <span className={styles.primaryText}>{formatAuditRelative(item.occurredAt)}</span>
                      <span className={styles.secondaryText}>{formatAuditDate(item.occurredAt)}</span>
                    </td>
                    <td className={styles.td}>
                      <AuditEventTypeBadge eventType={item.eventType} action={item.data?.action} />
                    </td>
                    <td className={styles.td}>{formatAuditLevel(getAuditLevel(item))}</td>
                    <td className={styles.td}>
                      <span className={styles.primaryText}>{summarizeEvent(item)}</span>
                      <span className={styles.secondaryText}>
                        {formatScreenLabel(item.screen?.screenId ?? item.origin?.screenId, item.screen?.screenName ?? item.origin?.screenName)}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {item.actor?.displayName ?? item.actor?.username ?? item.actor?.userId ?? '—'}
                    </td>
                    <td className={styles.td}>{summarizeBusinessContext(item)}</td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEventId(item.eventId)}
                          type="button"
                          title="Ver detalhes"
                          aria-label="Ver detalhes do evento"
                        >
                          <Eye size={15} />
                          Detalhes
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        isOpen={selectedEventId !== null}
        onClose={() => setSelectedEventId(null)}
        title="Detalhes do evento"
        size="lg"
      >
        <div className={styles.detailModal}>
          <AuditEventDetailPanel eventId={selectedEventId} />
        </div>
      </Modal>
    </div>
  );
}
