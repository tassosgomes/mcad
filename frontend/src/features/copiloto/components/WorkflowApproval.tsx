import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@components/ui/button';
import type { SuspendedWorkflow } from '../types/copiloto';
import styles from './WorkflowApproval.module.css';

interface WorkflowApprovalProps {
  workflow: SuspendedWorkflow;
  isSubmitting: boolean;
  errorMessage?: string;
  onApprove: () => void;
  onCancel: () => void;
}

export function WorkflowApproval({
  workflow,
  isSubmitting,
  errorMessage,
  onApprove,
  onCancel,
}: WorkflowApprovalProps) {
  return (
    <aside className={styles.panel} aria-labelledby="workflow-approval-title">
      <div className={styles.header}>
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <h2 id="workflow-approval-title">Aprovação necessária</h2>
          <p>O fluxo foi suspenso antes de executar a próxima etapa.</p>
        </div>
      </div>

      <div className={styles.proposal}>
        <span>Proposta</span>
        <p>{workflow.proposal?.trim() || 'Revise a operação proposta pelo Copiloto antes de continuar.'}</p>
      </div>

      <dl className={styles.metadata}>
        <div>
          <dt>Workflow</dt>
          <dd>{workflow.workflowId}</dd>
        </div>
        <div>
          <dt>Execução</dt>
          <dd>{workflow.runId}</dd>
        </div>
        <div>
          <dt>Etapa</dt>
          <dd>{workflow.stepId}</dd>
        </div>
      </dl>

      {errorMessage && (
        <div className={styles.error} role="alert">
          {errorMessage}
        </div>
      )}

      <div className={styles.actions}>
        <Button type="button" onClick={onApprove} disabled={isSubmitting}>
          <CheckCircle2 size={16} /> Aprovar
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          <XCircle size={16} /> Cancelar
        </Button>
      </div>
    </aside>
  );
}
