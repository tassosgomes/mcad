import { useMemo, useState } from 'react';
import { Download, RotateCcw, Search } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { DEFAULT_PERIOD, PeriodPicker, resolvePeriod, type PeriodValue } from '../components/PeriodPicker';
import { ScreenSelect } from '../components/ScreenSelect';
import { UserAutocomplete, type SelectedUser } from '../components/UserAutocomplete';
import { formatScreenLabel } from '../constants/screenCatalog';
import { useScreenAccess } from '../hooks/useScreenAccess';
import { downloadCsv } from '../utils/exportCsv';
import { formatAuditDate, formatAuditRelative, toIsoDateTime } from '../utils/auditFormatters';
import styles from './AuditPage.module.css';

interface ScreenAccessFilters {
  user: SelectedUser | null;
  screenId: string;
  period: PeriodValue;
}

const PAGE_SIZE = 20;

function buildInitialFilters(): ScreenAccessFilters {
  return {
    user: null,
    screenId: '',
    period: { ...DEFAULT_PERIOD },
  };
}

export function ScreenAccessPage() {
  const [filters, setFilters] = useState<ScreenAccessFilters>(buildInitialFilters);
  const [submittedFilters, setSubmittedFilters] = useState<ScreenAccessFilters | null>(null);

  const resolvedPeriod = useMemo(
    () => (submittedFilters ? resolvePeriod(submittedFilters.period) : null),
    [submittedFilters],
  );

  const query = useScreenAccess(
    {
      userId: submittedFilters?.user?.id,
      screenId: submittedFilters?.screenId || undefined,
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

  const filterCriteriaSummary = submittedFilters
    ? [
        submittedFilters.user ? `usuário ${submittedFilters.user.label}` : null,
        submittedFilters.screenId ? `tela ${formatScreenLabel(submittedFilters.screenId)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <div className={styles.page}>
      <PageHeader
        title="Quem acessou o quê"
        description="Veja quais telas foram abertas, por quem e quando."
      />

      <form className={styles.filterCard} onSubmit={handleSubmit}>
        <div className={styles.filterRow}>
          <div className={styles.field}>
            <UserAutocomplete
              label="Quem acessou"
              value={filters.user}
              onChange={(user) => setFilters((prev) => ({ ...prev, user }))}
              placeholder="Buscar por nome, email ou identificador"
            />
            <span className={styles.fieldHint}>Deixe em branco para incluir todos os usuários.</span>
          </div>
          <div className={styles.field}>
            <ScreenSelect
              label="Tela"
              value={filters.screenId}
              onChange={(screenId) => setFilters((prev) => ({ ...prev, screenId }))}
              placeholder="Todas as telas"
            />
            <span className={styles.fieldHint}>Filtra por uma tela específica do produto.</span>
          </div>
        </div>
        <PeriodPicker
          value={filters.period}
          onChange={(period) => setFilters((prev) => ({ ...prev, period }))}
        />
        <div className={styles.filterActions}>
          <Button type="submit">
            <Search size={16} />
            Buscar acessos
          </Button>
          <Button type="button" variant="ghost" onClick={handleReset}>
            <RotateCcw size={16} />
            Limpar
          </Button>
        </div>
      </form>

      {!submittedFilters && (
        <div className={styles.zeroState}>
          <strong>Comece definindo o que você quer ver.</strong>
          <p>
            Você pode filtrar pelo usuário (quem), pela tela (o quê), ou pelos dois.
            Os últimos 7 dias já vêm selecionados — ajuste o período se precisar.
          </p>
        </div>
      )}

      {query.isLoading && <Loading />}

      {query.isError && (
        <div className={styles.errorState}>
          Não conseguimos consultar os acessos agora. Tente novamente em alguns instantes.
        </div>
      )}

      {submittedFilters && query.data && items.length === 0 && (
        <div className={styles.emptyState}>
          <strong>Nenhum acesso encontrado.</strong>
          <p>Tente ampliar o período ou remover algum filtro.</p>
        </div>
      )}

      {submittedFilters && query.data && items.length > 0 && (
        <>
          <div className={styles.tableHeader}>
            <span className={styles.resultsCount}>{totalLabel}</span>
            {filterCriteriaSummary && (
              <span className={styles.criteriaSummary}>Filtrando por {filterCriteriaSummary}</span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                downloadCsv(
                  `acessos-${new Date().toISOString().slice(0, 10)}.csv`,
                  [
                    { header: 'Data', accessor: (item) => formatAuditDate(item.occurredAt) },
                    { header: 'Usuário', accessor: (item) => item.actor?.displayName ?? item.actor?.username ?? item.actor?.userId ?? '' },
                    { header: 'Tela', accessor: (item) => formatScreenLabel(item.screen?.screenId ?? item.origin?.screenId, item.screen?.screenName ?? item.origin?.screenName) },
                    { header: 'Identificador da tela', accessor: (item) => item.screen?.screenId ?? item.origin?.screenId ?? '' },
                    { header: 'IP', accessor: (item) => item.origin?.ip ?? '' },
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
                  <th className={styles.th}>Usuário</th>
                  <th className={styles.th}>Tela</th>
                  <th className={styles.th}>IP</th>
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
                      <span className={styles.primaryText}>
                        {item.actor?.displayName ?? item.actor?.username ?? item.actor?.userId ?? '—'}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.primaryText}>
                        {formatScreenLabel(
                          item.screen?.screenId ?? item.origin?.screenId,
                          item.screen?.screenName ?? item.origin?.screenName,
                        )}
                      </span>
                    </td>
                    <td className={styles.td}>{item.origin?.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
