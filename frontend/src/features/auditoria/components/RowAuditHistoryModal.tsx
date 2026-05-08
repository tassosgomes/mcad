import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Modal } from '@components/ui/modal';
import { Loading } from '@components/ui/loading';
import { AuditEventDetailPanel } from './AuditEventDetailPanel';
import { AuditEventTypeBadge } from './AuditEventTypeBadge';
import { useAuditEntityTimeline } from '../hooks/useAuditEntityTimeline';
import { formatAuditDate, formatAuditValue } from '../utils/auditFormatters';
import styles from './RowAuditHistoryModal.module.css';

interface RowAuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  entityLabel?: string;
}

export function RowAuditHistoryModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityLabel,
}: RowAuditHistoryModalProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { data, isLoading, isError } = useAuditEntityTimeline(
    { entityType, entityId, page: 0, size: 5, eventType: 'DATA_CHANGE' },
    isOpen,
  );

  const items = data?.items ?? [];
  const activeEventId = selectedEventId ?? items[0]?.eventId ?? null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Histórico ${entityLabel ? `— ${entityLabel}` : ''}`}
      size="lg"
    >
      <div className={styles.header}>
        <span>{entityType}</span>
        <strong>{entityId}</strong>
      </div>

      {isLoading && <Loading />}

      {isError && (
        <div className={styles.empty}>Não foi possível carregar o histórico desta linha.</div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className={styles.empty}>Nenhum histórico de auditoria encontrado para esta linha.</div>
      )}

      {items.length > 0 && (
        <div className={styles.content}>
          <div className={styles.timeline}>
            {items.map((item) => (
              <button
                key={item.eventId}
                className={[
                  styles.timelineItem,
                  item.eventId === activeEventId ? styles.active : '',
                ].join(' ')}
                onClick={() => setSelectedEventId(item.eventId)}
                type="button"
              >
                <div className={styles.timelineTop}>
                  <AuditEventTypeBadge eventType={item.eventType} />
                  <span>{formatAuditDate(item.occurredAt)}</span>
                </div>
                <strong>{item.summary ?? item.action ?? 'Alteração registrada'}</strong>
                <span>{item.actor?.displayName ?? item.actor?.username ?? item.actor?.userId ?? '-'}</span>
                {item.changedFields && item.changedFields.length > 0 && (
                  <div className={styles.changedFields}>
                    {item.changedFields.slice(0, 2).map((field) => (
                      <span key={field.field}>
                        {field.field}: {formatAuditValue(field.before)} → {formatAuditValue(field.after)}
                      </span>
                    ))}
                  </div>
                )}
                <ChevronRight size={16} className={styles.chevron} />
              </button>
            ))}
          </div>

          <div className={styles.detail}>
            <AuditEventDetailPanel eventId={activeEventId} />
          </div>
        </div>
      )}
    </Modal>
  );
}
