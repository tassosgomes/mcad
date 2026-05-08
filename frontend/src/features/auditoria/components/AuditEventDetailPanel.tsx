import { Badge } from '@components/ui/badge';
import { Loading } from '@components/ui/loading';
import { useAuditEvent } from '../hooks/useAuditEvent';
import { formatAuditDate, formatAuditValue } from '../utils/auditFormatters';
import styles from './AuditEventDetailPanel.module.css';

interface AuditEventDetailPanelProps {
  eventId: string | null;
}

export function AuditEventDetailPanel({ eventId }: AuditEventDetailPanelProps) {
  const { data, isLoading, isError } = useAuditEvent(eventId);

  if (!eventId) {
    return <div className={styles.empty}>Selecione um evento para visualizar o detalhe.</div>;
  }

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return <div className={styles.empty}>Não foi possível carregar o evento de auditoria.</div>;
  }

  const changedFields = data.data?.changedFields ?? [];

  return (
    <div className={styles.panel}>
      <div className={styles.summaryGrid}>
        <div>
          <span className={styles.label}>Evento</span>
          <span className={styles.mono}>{data.eventId}</span>
        </div>
        <div>
          <span className={styles.label}>Data</span>
          <span>{formatAuditDate(data.occurredAt)}</span>
        </div>
        <div>
          <span className={styles.label}>Serviço</span>
          <span>{data.source?.service ?? '-'}</span>
        </div>
        <div>
          <span className={styles.label}>Usuário</span>
          <span>{data.actor?.displayName ?? data.actor?.username ?? data.actor?.userId ?? '-'}</span>
        </div>
        <div>
          <span className={styles.label}>Tela</span>
          <span>{data.origin?.screenName ?? data.screen?.screenName ?? '-'}</span>
        </div>
        <div>
          <span className={styles.label}>Rota</span>
          <span>{data.origin?.route ?? '-'}</span>
        </div>
      </div>

      {changedFields.length > 0 && (
        <section className={styles.section}>
          <h3>Campos alterados</h3>
          <div className={styles.fields}>
            {changedFields.map((field) => (
              <div key={field.field} className={styles.fieldRow}>
                <Badge variant="secondary" mono>{field.field}</Badge>
                <span className={styles.value}>{formatAuditValue(field.before)}</span>
                <span className={styles.arrow}>→</span>
                <span className={styles.value}>{formatAuditValue(field.after)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h3>Correlação</h3>
        <div className={styles.correlation}>
          <span><strong>screenAccessId</strong> {data.correlation?.screenAccessId ?? '-'}</span>
          <span><strong>commandId</strong> {data.correlation?.commandId ?? '-'}</span>
          <span><strong>traceId</strong> {data.correlation?.traceId ?? '-'}</span>
          <span><strong>requestId</strong> {data.correlation?.requestId ?? '-'}</span>
        </div>
      </section>

      <details className={styles.jsonBlock}>
        <summary>Payload completo</summary>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}
