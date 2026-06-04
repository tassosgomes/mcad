import { Loading } from '@components/ui/loading';
import { Badge } from '@components/ui/badge';
import { AuditEventTypeBadge } from './AuditEventTypeBadge';
import { formatEntityType } from '../constants/auditEntityTypes';
import { formatScreenLabel } from '../constants/screenCatalog';
import { useAuditEvent } from '../hooks/useAuditEvent';
import { formatAuditDate, formatAuditRelative, formatAuditValue } from '../utils/auditFormatters';
import { describeEventDetail } from '../utils/auditNarrative';
import styles from './AuditEventDetailPanel.module.css';

interface AuditEventDetailPanelProps {
  eventId: string | null;
}

export function AuditEventDetailPanel({ eventId }: AuditEventDetailPanelProps) {
  const { data, isLoading, isError } = useAuditEvent(eventId);

  if (!eventId) {
    return <div className={styles.empty}>Selecione um evento para ver os detalhes.</div>;
  }

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return <div className={styles.empty}>Não foi possível carregar este evento.</div>;
  }

  const narrative = describeEventDetail(data);
  const changedFields = data.data?.changedFields ?? [];
  const actor = data.actor?.displayName ?? data.actor?.username ?? data.actor?.userId ?? 'Usuário';
  const screenLabel = formatScreenLabel(
    data.origin?.screenId ?? data.screen?.screenId,
    data.origin?.screenName ?? data.screen?.screenName,
  );
  const entityLabel = formatEntityType(data.data?.entityType ?? null);

  return (
    <div className={styles.panel}>
      <header className={styles.headline}>
        <div className={styles.headlineBadges}>
          <AuditEventTypeBadge eventType={data.eventType} action={data.data?.action} />
          <span className={styles.headlineTime}>
            {formatAuditRelative(data.occurredAt)} · {formatAuditDate(data.occurredAt)}
          </span>
        </div>
        <p className={styles.narrative}>{narrative}</p>
      </header>

      <section className={styles.contextGrid}>
        <div>
          <span className={styles.label}>Quem</span>
          <span className={styles.contextValue}>{actor}</span>
        </div>
        <div>
          <span className={styles.label}>De onde (tela)</span>
          <span className={styles.contextValue}>{screenLabel}</span>
        </div>
        {data.data?.entityType && (
          <div>
            <span className={styles.label}>Entidade afetada</span>
            <span className={styles.contextValue}>{entityLabel}</span>
          </div>
        )}
        {data.source?.service && (
          <div>
            <span className={styles.label}>Serviço de origem</span>
            <span className={styles.contextValue}>{data.source.service}</span>
          </div>
        )}
      </section>

      {changedFields.length > 0 && (
        <section className={styles.section}>
          <h3>O que mudou</h3>
          <div className={styles.fields}>
            {changedFields.map((field) => (
              <article key={field.field} className={styles.fieldRow}>
                <Badge variant="secondary" mono>
                  {field.field}
                </Badge>
                <div className={styles.diffRow}>
                  <span className={styles.diffLabel}>Antes</span>
                  <span className={[styles.valueChip, styles.valueBefore].join(' ')}>
                    {formatAuditValue(field.before)}
                  </span>
                </div>
                <div className={styles.diffRow}>
                  <span className={styles.diffLabel}>Depois</span>
                  <span className={[styles.valueChip, styles.valueAfter].join(' ')}>
                    {formatAuditValue(field.after)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {data.eventType === 'USER_ACTION' && data.action?.businessContext && (
        <section className={styles.section}>
          <h3>Contexto da ação</h3>
          <dl className={styles.contextList}>
            {Object.entries(data.action.businessContext).map(([key, value]) => (
              <div key={key} className={styles.contextItem}>
                <dt>{key}</dt>
                <dd>{formatAuditValue(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <details className={styles.technicalSection}>
        <summary className={styles.technicalSummary}>
          Detalhes técnicos (para suporte)
        </summary>
        <div className={styles.technicalBody}>
          <dl className={styles.contextList}>
            <div className={styles.contextItem}>
              <dt>ID do evento</dt>
              <dd className={styles.mono}>{data.eventId}</dd>
            </div>
            {data.data?.entityId && (
              <div className={styles.contextItem}>
                <dt>ID da entidade</dt>
                <dd className={styles.mono}>{data.data.entityId}</dd>
              </div>
            )}
            {data.correlation?.traceId && (
              <div className={styles.contextItem}>
                <dt>Trace</dt>
                <dd className={styles.mono}>{data.correlation.traceId}</dd>
              </div>
            )}
            {data.correlation?.commandId && (
              <div className={styles.contextItem}>
                <dt>Command</dt>
                <dd className={styles.mono}>{data.correlation.commandId}</dd>
              </div>
            )}
            {data.correlation?.screenAccessId && (
              <div className={styles.contextItem}>
                <dt>Screen access</dt>
                <dd className={styles.mono}>{data.correlation.screenAccessId}</dd>
              </div>
            )}
            {data.correlation?.requestId && (
              <div className={styles.contextItem}>
                <dt>Request</dt>
                <dd className={styles.mono}>{data.correlation.requestId}</dd>
              </div>
            )}
            {data.origin?.route && (
              <div className={styles.contextItem}>
                <dt>Rota</dt>
                <dd className={styles.mono}>{data.origin.route}</dd>
              </div>
            )}
            {data.origin?.ip && (
              <div className={styles.contextItem}>
                <dt>IP</dt>
                <dd className={styles.mono}>{data.origin.ip}</dd>
              </div>
            )}
          </dl>
          <details className={styles.payloadBlock}>
            <summary>Payload completo (JSON)</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      </details>
    </div>
  );
}
