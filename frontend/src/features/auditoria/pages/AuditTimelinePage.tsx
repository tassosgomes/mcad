import { useMemo, useState } from 'react';
import { Download, Eye, RotateCcw, Search } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { Modal } from '@components/ui/modal';
import { PageHeader } from '@components/ui/page-header';
import { AuditEventDetailPanel } from '../components/AuditEventDetailPanel';
import { AuditEventTypeBadge } from '../components/AuditEventTypeBadge';
import { DEFAULT_PERIOD, PeriodPicker, resolvePeriod, type PeriodValue } from '../components/PeriodPicker';
import { UserAutocomplete, type SelectedUser } from '../components/UserAutocomplete';
import { auditEntityTypeOptions, formatEntityType } from '../constants/auditEntityTypes';
import { formatScreenLabel } from '../constants/screenCatalog';
import { useAuditEntityTimeline } from '../hooks/useAuditEntityTimeline';
import { downloadCsv } from '../utils/exportCsv';
import { formatAuditDate, formatAuditRelative, toIsoDateTime } from '../utils/auditFormatters';
import { summarizeTimelineItem } from '../utils/auditNarrative';
import styles from './AuditPage.module.css';

interface TimelineFilters {
  entityType: string;
  entityId: string;
  user: SelectedUser | null;
  period: PeriodValue;
}

const PAGE_SIZE = 20;

function buildInitialFilters(): TimelineFilters {
  return {
    entityType: 'ObraMusical',
    entityId: '',
    user: null,
    period: { ...DEFAULT_PERIOD },
  };
}

export function AuditTimelinePage() {
  const [filters, setFilters] = useState<TimelineFilters>(buildInitialFilters);
  const [submittedFilters, setSubmittedFilters] = useState<TimelineFilters | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const resolvedPeriod = useMemo(
    () => (submittedFilters ? resolvePeriod(submittedFilters.period) : null),
    [submittedFilters],
  );

  const query = useAuditEntityTimeline(
    {
      entityType: submittedFilters?.entityType ?? '',
      entityId: submittedFilters?.entityId ?? '',
      from: toIsoDateTime(resolvedPeriod?.from ?? ''),
      to: toIsoDateTime(resolvedPeriod?.to ?? ''),
      page: 0,
      size: PAGE_SIZE,
    },
    submittedFilters !== null && submittedFilters.entityId.length > 0,
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
    const next = buildInitialFilters();
    setFilters(next);
    setSubmittedFilters(null);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Histórico de alterações"
        description="Veja tudo que aconteceu com uma entidade — quem mudou, o que mudou e quando."
      />

      <form className={styles.filterCard} onSubmit={handleSubmit}>
        <div className={styles.filterRow}>
          <div className={styles.field}>
            <label htmlFor="entityType">Tipo</label>
            <select
              id="entityType"
              className={styles.select}
              value={filters.entityType}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, entityType: event.target.value }))
              }
            >
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
            <label htmlFor="entityId">Identificador</label>
            <input
              id="entityId"
              className={styles.input}
              value={filters.entityId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, entityId: event.target.value }))
              }
              placeholder="Cole o ID da entidade (disponível no botão Copiar ID)"
              required
              aria-describedby="entityId-hint"
            />
            <span id="entityId-hint" className={styles.fieldHint}>
              É o identificador interno da {formatEntityType(filters.entityType).toLowerCase()}.
            </span>
          </div>
          <div className={styles.field}>
            <UserAutocomplete
              label="Quem mexeu (opcional)"
              value={filters.user}
              onChange={(user) => setFilters((prev) => ({ ...prev, user }))}
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
            Buscar histórico
          </Button>
          <Button type="button" variant="ghost" onClick={handleReset}>
            <RotateCcw size={16} />
            Limpar
          </Button>
        </div>
      </form>

      {!submittedFilters && (
        <div className={styles.zeroState}>
          <strong>Comece escolhendo uma entidade e um período.</strong>
          <p>
            Exemplo: para ver tudo que mudou numa obra musical nos últimos 7 dias,
            selecione <em>Obra musical</em>, cole o identificador da obra e clique em <em>Buscar</em>.
          </p>
        </div>
      )}

      {query.isLoading && <Loading />}

      {query.isError && (
        <div className={styles.errorState}>
          Não conseguimos consultar o histórico agora. Tente novamente em alguns instantes.
        </div>
      )}

      {submittedFilters && query.data && items.length === 0 && (
        <div className={styles.emptyState}>
          <strong>Nada encontrado neste período.</strong>
          <p>Tente ampliar o intervalo de datas ou confirme se o identificador está correto.</p>
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
                  `historico-${submittedFilters.entityType}-${new Date().toISOString().slice(0, 10)}.csv`,
                  [
                    { header: 'Data', accessor: (item) => formatAuditDate(item.occurredAt) },
                    { header: 'Tipo', accessor: (item) => item.eventType },
                    { header: 'Ação', accessor: (item) => item.action ?? '' },
                    { header: 'Resumo', accessor: (item) => summarizeTimelineItem(item, submittedFilters.entityType) },
                    { header: 'Usuário', accessor: (item) => item.actor?.displayName ?? item.actor?.username ?? '' },
                    { header: 'Tela', accessor: (item) => formatScreenLabel(item.screen?.screenId, item.screen?.screenName) },
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
                  <th className={styles.th}>O que aconteceu</th>
                  <th className={styles.th}>Quem</th>
                  <th className={styles.th}>De onde</th>
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
                      <AuditEventTypeBadge eventType={item.eventType} action={item.action} />
                    </td>
                    <td className={styles.td}>
                      <span className={styles.primaryText}>
                        {summarizeTimelineItem(item, submittedFilters.entityType)}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {item.actor?.displayName ?? item.actor?.username ?? '—'}
                    </td>
                    <td className={styles.td}>
                      {formatScreenLabel(item.screen?.screenId, item.screen?.screenName)}
                    </td>
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
