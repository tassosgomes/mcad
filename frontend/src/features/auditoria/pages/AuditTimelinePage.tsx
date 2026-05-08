import { useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { Modal } from '@components/ui/modal';
import { PageHeader } from '@components/ui/page-header';
import { AuditEventDetailPanel } from '../components/AuditEventDetailPanel';
import { AuditEventTypeBadge } from '../components/AuditEventTypeBadge';
import { AuditTabs } from '../components/AuditTabs';
import { auditEntityTypeOptions } from '../constants/auditEntityTypes';
import { useAuditEntityTimeline } from '../hooks/useAuditEntityTimeline';
import { formatAuditDate, toIsoDateTime } from '../utils/auditFormatters';
import styles from './AuditPage.module.css';

interface TimelineFilters {
  entityType: string;
  entityId: string;
  from: string;
  to: string;
}

export function AuditTimelinePage() {
  const [filters, setFilters] = useState<TimelineFilters>({
    entityType: 'ObraMusical',
    entityId: '',
    from: '',
    to: '',
  });
  const [submittedFilters, setSubmittedFilters] = useState<TimelineFilters | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const query = useAuditEntityTimeline(
    {
      entityType: submittedFilters?.entityType ?? '',
      entityId: submittedFilters?.entityId ?? '',
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
        title="Auditoria"
        description="Consulta de eventos consolidados no serviço central de auditoria."
      />
      <AuditTabs />

      <form className={styles.filters} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="entityType">Entidade</label>
          <select
            id="entityType"
            className={styles.select}
            value={filters.entityType}
            onChange={(event) => setFilters((prev) => ({ ...prev, entityType: event.target.value }))}
          >
            {auditEntityTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="entityId">ID da linha</label>
          <input
            id="entityId"
            className={styles.input}
            value={filters.entityId}
            onChange={(event) => setFilters((prev) => ({ ...prev, entityId: event.target.value }))}
            placeholder="UUID ou código da entidade"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="from">De</label>
          <input
            id="from"
            className={styles.input}
            type="datetime-local"
            value={filters.from}
            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="to">Até</label>
          <input
            id="to"
            className={styles.input}
            type="datetime-local"
            value={filters.to}
            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
          />
        </div>
        <Button type="submit">
          <Search size={16} />
          Buscar
        </Button>
      </form>

      {query.isLoading && <Loading />}

      {query.isError && (
        <div className={styles.empty}>Não foi possível consultar a timeline no serviço de auditoria.</div>
      )}

      {query.data && items.length === 0 && (
        <div className={styles.empty}>Nenhum evento encontrado para a entidade informada.</div>
      )}

      {query.data && items.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Data</th>
                <th className={styles.th}>Tipo</th>
                <th className={styles.th}>Resumo</th>
                <th className={styles.th}>Usuário</th>
                <th className={styles.th}>Tela</th>
                <th className={styles.th} aria-label="Ações">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.eventId} className={styles.row}>
                  <td className={`${styles.td} ${styles.mono}`}>{formatAuditDate(item.occurredAt)}</td>
                  <td className={styles.td}><AuditEventTypeBadge eventType={item.eventType} /></td>
                  <td className={styles.td}>
                    <span className={styles.primaryText}>{item.summary ?? item.action ?? 'Evento registrado'}</span>
                    <span className={styles.secondaryText}>{item.eventId}</span>
                  </td>
                  <td className={styles.td}>{item.actor?.displayName ?? item.actor?.username ?? item.actor?.userId ?? '-'}</td>
                  <td className={styles.td}>{item.screen?.screenName ?? item.screen?.screenId ?? '-'}</td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEventId(item.eventId)}
                        type="button"
                        title="Ver evento"
                        aria-label="Ver evento"
                      >
                        <Eye size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={selectedEventId !== null}
        onClose={() => setSelectedEventId(null)}
        title="Detalhe do evento"
        size="lg"
      >
        <div className={styles.detailModal}>
          <AuditEventDetailPanel eventId={selectedEventId} />
        </div>
      </Modal>
    </div>
  );
}
