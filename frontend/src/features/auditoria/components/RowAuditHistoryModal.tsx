import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Modal } from '@components/ui/modal';
import { Loading } from '@components/ui/loading';
import { AuditEventDetailPanel } from './AuditEventDetailPanel';
import { AuditEventTypeBadge } from './AuditEventTypeBadge';
import { useAuditEntityTimeline } from '../hooks/useAuditEntityTimeline';
import { formatAuditDate, formatAuditRelative } from '../utils/auditFormatters';
import { summarizeTimelineItem } from '../utils/auditNarrative';
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
      title={`Histórico${entityLabel ? ` — ${entityLabel}` : ''}`}
      size="lg"
    >
      {isLoading && <Loading />}

      {isError && (
        <div className={styles.empty}>Não foi possível carregar o histórico desta linha.</div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className={styles.empty}>Ainda não há alterações registradas nesta linha.</div>
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
                  <AuditEventTypeBadge eventType={item.eventType} action={item.action} />
                  <span>{formatAuditRelative(item.occurredAt)}</span>
                </div>
                <strong>{summarizeTimelineItem(item, entityType)}</strong>
                <span className={styles.timelineMeta}>{formatAuditDate(item.occurredAt)}</span>
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
