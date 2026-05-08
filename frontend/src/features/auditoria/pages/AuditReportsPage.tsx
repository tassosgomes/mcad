import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@components/ui/button';
import { PageHeader } from '@components/ui/page-header';
import { AuditTabs } from '../components/AuditTabs';
import { getAuditReportPdfUrl } from '../api/auditoriaApi';
import { useAuditReport, useCreateAuditReport } from '../hooks/useAuditReport';
import type { AuditReportType } from '../types/audit-event';
import { formatAuditDate, toIsoDateTime } from '../utils/auditFormatters';
import styles from './AuditPage.module.css';

interface ReportForm {
  reportType: AuditReportType;
  from: string;
  to: string;
  entityType: string;
  actorUserId: string;
  screenId: string;
}

export function AuditReportsPage() {
  const [form, setForm] = useState<ReportForm>({
    reportType: 'DATA_CHANGE',
    from: '',
    to: '',
    entityType: '',
    actorUserId: '',
    screenId: '',
  });
  const [reportId, setReportId] = useState<string | null>(null);
  const createReport = useCreateAuditReport();
  const reportQuery = useAuditReport(reportId);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const from = toIsoDateTime(form.from);
    const to = toIsoDateTime(form.to);

    if (!from || !to) {
      return;
    }

    createReport.mutate(
      {
        reportType: form.reportType,
        from,
        to,
        filters: {
          entityType: form.entityType || undefined,
          actorUserId: form.actorUserId || undefined,
          screenId: form.screenId || undefined,
        },
        format: 'PDF',
      },
      {
        onSuccess: (response) => setReportId(response.reportId),
      },
    );
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Relatórios de auditoria"
        description="Geração assíncrona de PDF pelo serviço central de auditoria."
      />
      <AuditTabs />

      <div className={styles.reportPanel}>
        <form className={styles.filters} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="reportType">Tipo</label>
            <select
              id="reportType"
              className={styles.select}
              value={form.reportType}
              onChange={(event) => setForm((prev) => ({ ...prev, reportType: event.target.value as AuditReportType }))}
            >
              <option value="DATA_CHANGE">Alteração de dados</option>
              <option value="SCREEN_ACCESS">Acesso a telas</option>
              <option value="MIXED">Misto</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="from">De</label>
            <input id="from" className={styles.input} type="datetime-local" value={form.from} onChange={(event) => setForm((prev) => ({ ...prev, from: event.target.value }))} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="to">Até</label>
            <input id="to" className={styles.input} type="datetime-local" value={form.to} onChange={(event) => setForm((prev) => ({ ...prev, to: event.target.value }))} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="entityType">Entidade</label>
            <input id="entityType" className={styles.input} value={form.entityType} onChange={(event) => setForm((prev) => ({ ...prev, entityType: event.target.value }))} />
          </div>
          <div className={styles.field}>
            <label htmlFor="actorUserId">Usuário</label>
            <input id="actorUserId" className={styles.input} value={form.actorUserId} onChange={(event) => setForm((prev) => ({ ...prev, actorUserId: event.target.value }))} />
          </div>
          <div className={styles.field}>
            <label htmlFor="screenId">Tela</label>
            <input id="screenId" className={styles.input} value={form.screenId} onChange={(event) => setForm((prev) => ({ ...prev, screenId: event.target.value }))} />
          </div>
          <Button type="submit" disabled={createReport.isPending}>
            <FileText size={16} />
            Gerar PDF
          </Button>
        </form>

        <aside className={styles.statusPanel}>
          <h2>Status</h2>
          {!reportId && <p className={styles.secondaryText}>Nenhum relatório solicitado nesta sessão.</p>}
          {createReport.isError && <p className={styles.secondaryText}>Não foi possível solicitar o relatório.</p>}
          {reportId && (
            <>
              <p><span className={styles.secondaryText}>ID</span> <span className={styles.mono}>{reportId}</span></p>
              <p><span className={styles.secondaryText}>Status</span> {reportQuery.data?.status ?? 'Consultando...'}</p>
              {reportQuery.data?.requestedAt && (
                <p><span className={styles.secondaryText}>Solicitado em</span> {formatAuditDate(reportQuery.data.requestedAt)}</p>
              )}
              {reportQuery.data?.finishedAt && (
                <p><span className={styles.secondaryText}>Finalizado em</span> {formatAuditDate(reportQuery.data.finishedAt)}</p>
              )}
              {reportQuery.data?.status === 'DONE' && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => window.open(getAuditReportPdfUrl(reportId), '_blank', 'noopener,noreferrer')}
                >
                  <Download size={16} />
                  Baixar PDF
                </Button>
              )}
              {reportQuery.data?.status === 'FAILED' && (
                <p className={styles.secondaryText}>{reportQuery.data.errorMessage ?? 'Relatório falhou.'}</p>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
