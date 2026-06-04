import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, History, RotateCcw } from 'lucide-react';
import { Button } from '@components/ui/button';
import { PageHeader } from '@components/ui/page-header';
import { DEFAULT_PERIOD, PeriodPicker, resolvePeriod, type PeriodValue } from '../components/PeriodPicker';
import { ScreenSelect } from '../components/ScreenSelect';
import { UserAutocomplete, type SelectedUser } from '../components/UserAutocomplete';
import { auditEntityTypeOptions } from '../constants/auditEntityTypes';
import { downloadAuditReportPdf } from '../api/auditoriaApi';
import { useAuditReport, useCreateAuditReport } from '../hooks/useAuditReport';
import type { AuditReportStatus, AuditReportType } from '../types/audit-event';
import { formatAuditDate, toIsoDateTime } from '../utils/auditFormatters';
import styles from './AuditPage.module.css';

interface ReportForm {
  reportType: AuditReportType;
  period: PeriodValue;
  entityType: string;
  user: SelectedUser | null;
  screenId: string;
}

interface ReportHistoryEntry {
  reportId: string;
  reportType: AuditReportType;
  requestedAt: string;
  description: string;
}

const REPORT_TYPE_LABEL: Record<AuditReportType, string> = {
  DATA_CHANGE: 'Alterações em dados',
  SCREEN_ACCESS: 'Acessos a telas',
  MIXED: 'Alterações + Acessos',
};

const REPORT_STATUS_LABEL: Record<AuditReportStatus, string> = {
  PENDING: 'Na fila',
  RUNNING: 'Gerando…',
  DONE: 'Pronto',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
};

const HISTORY_KEY = 'mcad.auditoria.reports.history';
const HISTORY_LIMIT = 8;

function loadHistory(): ReportHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReportHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: ReportHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    // ignore quota errors
  }
}

function buildInitialForm(): ReportForm {
  return {
    reportType: 'DATA_CHANGE',
    period: { ...DEFAULT_PERIOD },
    entityType: '',
    user: null,
    screenId: '',
  };
}

async function triggerPdfDownload(reportId: string): Promise<void> {
  const { blob, filename } = await downloadAuditReportPdf(reportId);
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export function AuditReportsPage() {
  const [form, setForm] = useState<ReportForm>(buildInitialForm);
  const [reportId, setReportId] = useState<string | null>(null);
  const [history, setHistory] = useState<ReportHistoryEntry[]>(() => loadHistory());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const createReport = useCreateAuditReport();
  const reportQuery = useAuditReport(reportId);

  const handleDownload = async (id: string) => {
    setDownloadError(null);
    setDownloadingId(id);
    try {
      await triggerPdfDownload(id);
    } catch (error) {
      const detail = (error as { detail?: string; title?: string } | null)?.detail
        ?? (error as { title?: string } | null)?.title
        ?? 'Não foi possível baixar o PDF.';
      setDownloadError(detail);
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const resolvedPeriod = useMemo(() => resolvePeriod(form.period), [form.period]);

  const buildDescription = (snapshot: ReportForm): string => {
    const parts = [REPORT_TYPE_LABEL[snapshot.reportType]];
    if (snapshot.entityType) {
      const label = auditEntityTypeOptions.find((opt) => opt.value === snapshot.entityType)?.label
        ?? snapshot.entityType;
      parts.push(`entidade ${label}`);
    }
    if (snapshot.user) {
      parts.push(`usuário ${snapshot.user.label}`);
    }
    if (snapshot.screenId) {
      parts.push(`tela ${snapshot.screenId}`);
    }
    return parts.join(' · ');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const from = toIsoDateTime(resolvedPeriod.from);
    const to = toIsoDateTime(resolvedPeriod.to);

    if (!from || !to) {
      setValidationError('Selecione um período válido antes de gerar o relatório.');
      return;
    }
    setValidationError(null);

    createReport.mutate(
      {
        reportType: form.reportType,
        from,
        to,
        filters: {
          entityType: form.entityType || undefined,
          actorUserId: form.user?.id,
          screenId: form.screenId || undefined,
        },
        format: 'PDF',
      },
      {
        onSuccess: (response) => {
          setReportId(response.reportId);
          setHistory((prev) => [
            {
              reportId: response.reportId,
              reportType: form.reportType,
              requestedAt: new Date().toISOString(),
              description: buildDescription(form),
            },
            ...prev.filter((entry) => entry.reportId !== response.reportId),
          ]);
        },
      },
    );
  };

  const handleReset = () => {
    setForm(buildInitialForm());
    setReportId(null);
    setValidationError(null);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Relatórios em PDF"
        description="Monte um filtro, gere o relatório e baixe o PDF quando estiver pronto."
      />

      <div className={styles.reportPanel}>
        <form className={styles.filterCard} onSubmit={handleSubmit}>
          <div className={styles.filterRow}>
            <div className={styles.field}>
              <label htmlFor="reportType">Conteúdo do relatório</label>
              <select
                id="reportType"
                className={styles.select}
                value={form.reportType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, reportType: event.target.value as AuditReportType }))
                }
              >
                {(Object.keys(REPORT_TYPE_LABEL) as AuditReportType[]).map((type) => (
                  <option key={type} value={type}>
                    {REPORT_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="entityType">Limitar a uma entidade (opcional)</label>
              <select
                id="entityType"
                className={styles.select}
                value={form.entityType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, entityType: event.target.value }))
                }
              >
                <option value="">Todas as entidades</option>
                {auditEntityTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <UserAutocomplete
                label="Limitar a um usuário (opcional)"
                value={form.user}
                onChange={(user) => setForm((prev) => ({ ...prev, user }))}
              />
            </div>
            <div className={styles.field}>
              <ScreenSelect
                label="Limitar a uma tela (opcional)"
                value={form.screenId}
                onChange={(screenId) => setForm((prev) => ({ ...prev, screenId }))}
                placeholder="Todas as telas"
              />
            </div>
          </div>
          <PeriodPicker
            value={form.period}
            onChange={(period) => setForm((prev) => ({ ...prev, period }))}
          />
          {validationError && (
            <div className={styles.errorState}>{validationError}</div>
          )}
          <div className={styles.filterActions}>
            <Button type="submit" disabled={createReport.isPending}>
              <FileText size={16} />
              {createReport.isPending ? 'Solicitando…' : 'Gerar relatório'}
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset}>
              <RotateCcw size={16} />
              Limpar
            </Button>
          </div>
        </form>

        <aside className={styles.statusPanel} aria-label="Status do relatório atual">
          <h2>Status</h2>
          {!reportId && (
            <p className={styles.secondaryText}>
              Nenhum relatório solicitado agora. Configure os filtros à esquerda e clique em
              <strong> Gerar relatório</strong>.
            </p>
          )}
          {createReport.isError && !reportId && (
            <p className={styles.errorState}>Não foi possível solicitar o relatório.</p>
          )}
          {reportId && (
            <div className={styles.statusBody}>
              <p>
                <span className={styles.statusBadge}>
                  {REPORT_STATUS_LABEL[reportQuery.data?.status ?? 'PENDING']}
                </span>
              </p>
              {reportQuery.data?.requestedAtUtc && (
                <p>
                  <span className={styles.secondaryText}>Solicitado em </span>
                  {formatAuditDate(reportQuery.data.requestedAtUtc)}
                </p>
              )}
              {reportQuery.data?.status === 'DONE' && (
                <Button
                  variant="secondary"
                  type="button"
                  disabled={downloadingId === reportId}
                  onClick={() => void handleDownload(reportId)}
                >
                  <Download size={16} />
                  {downloadingId === reportId ? 'Baixando…' : 'Baixar PDF'}
                </Button>
              )}
              {downloadError && downloadingId === null && (
                <p className={styles.errorState}>{downloadError}</p>
              )}
              {reportQuery.data?.status === 'FAILED' && (
                <p className={styles.errorState}>
                  {reportQuery.data.errorMessage ?? 'O relatório não pôde ser gerado.'}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      {history.length > 0 && (
        <section className={styles.historySection} aria-label="Últimos relatórios">
          <h2 className={styles.historyTitle}>
            <History size={16} aria-hidden="true" /> Últimos relatórios
          </h2>
          <ul className={styles.historyList}>
            {history.map((entry) => (
              <li key={entry.reportId} className={styles.historyItem}>
                <div className={styles.historyMeta}>
                  <span className={styles.primaryText}>{REPORT_TYPE_LABEL[entry.reportType]}</span>
                  <span className={styles.secondaryText}>{entry.description}</span>
                  <span className={styles.secondaryText}>{formatAuditDate(entry.requestedAt)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  disabled={downloadingId === entry.reportId}
                  onClick={() => void handleDownload(entry.reportId)}
                >
                  <Download size={14} />
                  {downloadingId === entry.reportId ? 'Baixando…' : 'Baixar'}
                </Button>
              </li>
            ))}
          </ul>
          <p className={styles.historyFooter}>
            Lista guardada neste navegador. Disponível enquanto o relatório existir no servidor.
          </p>
        </section>
      )}
    </div>
  );
}
