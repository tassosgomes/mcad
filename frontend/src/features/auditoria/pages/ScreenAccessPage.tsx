import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { AuditTabs } from '../components/AuditTabs';
import { useScreenAccess } from '../hooks/useScreenAccess';
import { formatAuditDate, toIsoDateTime } from '../utils/auditFormatters';
import styles from './AuditPage.module.css';

interface ScreenAccessFilters {
  userId: string;
  screenId: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
}

export function ScreenAccessPage() {
  const [filters, setFilters] = useState<ScreenAccessFilters>({
    userId: '',
    screenId: '',
    entityType: '',
    entityId: '',
    from: '',
    to: '',
  });
  const [submittedFilters, setSubmittedFilters] = useState<ScreenAccessFilters | null>(null);

  const query = useScreenAccess(
    {
      userId: submittedFilters?.userId,
      screenId: submittedFilters?.screenId,
      entityType: submittedFilters?.entityType,
      entityId: submittedFilters?.entityId,
      from: toIsoDateTime(submittedFilters?.from ?? ''),
      to: toIsoDateTime(submittedFilters?.to ?? ''),
      page: 0,
      size: 20,
    },
    submittedFilters !== null,
  );
  const items = query.data?.items ?? [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedFilters(filters);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Acessos a telas"
        description="Consulta dos eventos SCREEN_ACCESS registrados pelo serviço central de auditoria."
      />
      <AuditTabs />

      <form className={styles.filters} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="userId">Usuário</label>
          <input id="userId" className={styles.input} value={filters.userId} onChange={(event) => setFilters((prev) => ({ ...prev, userId: event.target.value }))} />
        </div>
        <div className={styles.field}>
          <label htmlFor="screenId">Tela</label>
          <input id="screenId" className={styles.input} value={filters.screenId} onChange={(event) => setFilters((prev) => ({ ...prev, screenId: event.target.value }))} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="entityType">Entidade</label>
          <input id="entityType" className={styles.input} value={filters.entityType} onChange={(event) => setFilters((prev) => ({ ...prev, entityType: event.target.value }))} />
        </div>
        <div className={styles.field}>
          <label htmlFor="entityId">ID da entidade</label>
          <input id="entityId" className={styles.input} value={filters.entityId} onChange={(event) => setFilters((prev) => ({ ...prev, entityId: event.target.value }))} />
        </div>
        <div className={styles.field}>
          <label htmlFor="from">De</label>
          <input id="from" className={styles.input} type="datetime-local" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="to">Até</label>
          <input id="to" className={styles.input} type="datetime-local" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} required />
        </div>
        <Button type="submit">
          <Search size={16} />
          Buscar
        </Button>
      </form>

      {query.isLoading && <Loading />}
      {query.isError && <div className={styles.empty}>Não foi possível consultar acessos a telas.</div>}
      {query.data && items.length === 0 && <div className={styles.empty}>Nenhum acesso encontrado.</div>}

      {query.data && items.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Data</th>
                <th className={styles.th}>Usuário</th>
                <th className={styles.th}>Tela</th>
                <th className={styles.th}>Rota</th>
                <th className={styles.th}>IP</th>
                <th className={styles.th}>Trace</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.eventId} className={styles.row}>
                  <td className={`${styles.td} ${styles.mono}`}>{formatAuditDate(item.occurredAt)}</td>
                  <td className={styles.td}>{item.actor?.displayName ?? item.actor?.username ?? item.actor?.userId ?? '-'}</td>
                  <td className={styles.td}>
                    <span className={styles.primaryText}>{item.screen?.screenName ?? item.origin?.screenName ?? '-'}</span>
                    <span className={styles.secondaryText}>{item.screen?.screenId ?? item.origin?.screenId ?? '-'}</span>
                  </td>
                  <td className={styles.td}>{item.origin?.route ?? '-'}</td>
                  <td className={styles.td}>{item.origin?.ip ?? '-'}</td>
                  <td className={`${styles.td} ${styles.mono}`}>{item.correlation?.traceId ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
