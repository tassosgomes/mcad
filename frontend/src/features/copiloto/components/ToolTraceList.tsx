import { AlertTriangle, CheckCircle2, CircleSlash, Wrench } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import type { ToolCallStatus, ToolCallSummary } from '../types/copiloto';
import styles from './ToolTraceList.module.css';

interface ToolTraceListProps {
  toolCalls: ToolCallSummary[];
}

const statusLabel: Record<ToolCallStatus, string> = {
  success: 'Concluída',
  denied: 'Sem permissão',
  error: 'Falhou',
};

const statusVariant: Record<ToolCallStatus, 'success' | 'warning' | 'error'> = {
  success: 'success',
  denied: 'warning',
  error: 'error',
};

function ToolStatusIcon({ status }: { status: ToolCallStatus }) {
  if (status === 'success') {
    return <CheckCircle2 size={16} aria-hidden="true" />;
  }

  if (status === 'denied') {
    return <CircleSlash size={16} aria-hidden="true" />;
  }

  return <AlertTriangle size={16} aria-hidden="true" />;
}

export function ToolTraceList({ toolCalls }: ToolTraceListProps) {
  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <section className={styles.trace} aria-label="Ferramentas executadas">
      <div className={styles.header}>
        <Wrench size={16} aria-hidden="true" />
        <span>Ferramentas executadas</span>
      </div>
      <ul className={styles.list}>
        {toolCalls.map((toolCall) => (
          <li key={`${toolCall.toolId}-${toolCall.status}`} className={styles.item}>
            <span className={styles.toolId}>{toolCall.toolId}</span>
            <Badge variant={statusVariant[toolCall.status]}>
              <ToolStatusIcon status={toolCall.status} />
              {statusLabel[toolCall.status]}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
