import { useContext, useState } from 'react';
import { History } from 'lucide-react';
import { Button } from '@components/ui/button';
import { AuthContext } from '@shared/auth/AuthContext';
import { AUDIT_ALLOWED_ROLES } from '../constants/auditEntityTypes';
import { RowAuditHistoryModal } from './RowAuditHistoryModal';
import styles from './RowAuditHistoryButton.module.css';

interface RowAuditHistoryButtonProps {
  entityType: string;
  entityId: string | null | undefined;
  entityLabel?: string;
}

export function RowAuditHistoryButton({
  entityType,
  entityId,
  entityLabel,
}: RowAuditHistoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const auth = useContext(AuthContext);
  const roles = auth?.roles ?? [];
  const canReadAudit = AUDIT_ALLOWED_ROLES.some((role) => roles.includes(role));

  if (!canReadAudit || !entityId) {
    return null;
  }

  return (
    <>
      <Button
        className={styles.button}
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        aria-label={`Histórico de ${entityLabel ?? entityType}`}
        title="Histórico"
        type="button"
      >
        <History size={15} />
      </Button>
      <RowAuditHistoryModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        entityType={entityType}
        entityId={entityId}
        entityLabel={entityLabel}
      />
    </>
  );
}
