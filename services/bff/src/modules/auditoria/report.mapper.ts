export interface FrontendCreateReportPayload {
  reportType?: unknown;
  from?: unknown;
  to?: unknown;
  filters?: unknown;
  format?: unknown;
}

export interface UpstreamReportPayload {
  reportType: string;
  requestedBy: string;
  fromUtc: string;
  toUtc: string;
  filter: Record<string, unknown>;
}

const REPORT_TYPES = new Set(['DATA_CHANGE', 'SCREEN_ACCESS', 'MIXED']);

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function buildFilter(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const filter: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(source)) {
    if (raw === undefined || raw === null) continue;

    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.length > 0) {
        filter[key] = trimmed;
      }
      continue;
    }

    filter[key] = raw;
  }

  return filter;
}

function resolveRequestedBy(user: { name?: string; email?: string; subject: string; id?: string }): string {
  return (
    asString(user.name) ?? asString(user.email) ?? asString(user.subject) ?? asString(user.id) ?? 'unknown'
  );
}

export function buildUpstreamReportPayload(
  body: FrontendCreateReportPayload,
  user: { name?: string; email?: string; subject: string; id?: string },
): { ok: true; payload: UpstreamReportPayload } | { ok: false; message: string } {
  const reportType = asString(body.reportType);
  if (!reportType || !REPORT_TYPES.has(reportType)) {
    return { ok: false, message: 'reportType is required and must be one of DATA_CHANGE, SCREEN_ACCESS, MIXED' };
  }

  const fromUtc = asString(body.from);
  const toUtc = asString(body.to);
  if (!fromUtc || !toUtc) {
    return { ok: false, message: 'from and to are required (ISO instant)' };
  }

  return {
    ok: true,
    payload: {
      reportType,
      requestedBy: resolveRequestedBy(user),
      fromUtc,
      toUtc,
      filter: buildFilter(body.filters),
    },
  };
}
