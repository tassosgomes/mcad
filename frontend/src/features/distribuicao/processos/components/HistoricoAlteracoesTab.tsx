import { ErrorState } from '@components/ui/error-state';
import { Loading } from '@components/ui/loading';
import { useHistoricoProcesso, type AuditEvent } from '../api/historicoApi';
import styles from './HistoricoAlteracoesTab.module.css';

interface HistoricoAlteracoesTabProps {
  processoId: string;
}

interface DataChangeDiffProps {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function getSubjectLabel(event: AuditEvent): string {
  return event.subject.name || event.subject.email || event.subject.id;
}

function getEventTitle(event: AuditEvent): string {
  if (event.action) {
    return event.action;
  }

  if (event.eventType === 'DATA_CHANGE') {
    return 'Alteração de dados';
  }

  if (event.eventType === 'USER_ACTION') {
    return 'Ação do usuário';
  }

  return 'Acesso à tela';
}

function DataChangeDiff({ before = {}, after = {} }: DataChangeDiffProps) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  if (keys.length === 0) {
    return <div className={styles.empty}>Evento sem diff materializado.</div>;
  }

  return (
    <div className={styles.diffWrapper}>
      <table className={styles.diff}>
        <thead>
          <tr>
            <th className={styles.th}>Campo</th>
            <th className={styles.th}>Antes</th>
            <th className={styles.th}>Depois</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key}>
              <td className={styles.td}>{key}</td>
              <td className={styles.td}>{formatValue(before[key])}</td>
              <td className={styles.td}>{formatValue(after[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoricoEvent({ event }: { event: AuditEvent }) {
  return (
    <li className={styles.event}>
      <header className={styles.eventHeader}>
        <div className={styles.eventMeta}>
          <span className={styles.eventTitle}>{getEventTitle(event)}</span>
          <span className={styles.eventSubject}>{getSubjectLabel(event)}</span>
          <time className={styles.eventTime} dateTime={event.occurredAt}>
            {formatDateTime(event.occurredAt)}
          </time>
        </div>
        <span className={styles.badge}>{event.eventType}</span>
      </header>

      {event.eventType === 'DATA_CHANGE' && (
        <DataChangeDiff before={event.payload?.before} after={event.payload?.after} />
      )}

      {event.correlationId && (
        <span className={styles.correlation}>Correlation ID: {event.correlationId}</span>
      )}
    </li>
  );
}

export function HistoricoAlteracoesTab({ processoId }: HistoricoAlteracoesTabProps) {
  const historicoQuery = useHistoricoProcesso(processoId);
  const events = historicoQuery.data?.events ?? [];

  if (historicoQuery.isLoading) {
    return (
      <div role="status" aria-label="Carregando histórico de alterações">
        <Loading />
      </div>
    );
  }

  if (historicoQuery.isError) {
    return (
      <ErrorState
        message="Não foi possível carregar o histórico de alterações."
        onRetry={() => void historicoQuery.refetch()}
      />
    );
  }

  if (events.length === 0) {
    return <div className={styles.empty}>Sem alterações registradas.</div>;
  }

  return (
    <section className={styles.panel} aria-label="Histórico de alterações">
      <ol className={styles.timeline}>
        {events.map((event) => (
          <HistoricoEvent key={event.id} event={event} />
        ))}
      </ol>
    </section>
  );
}
