export type AuditMetricLevel = 'SILVER' | 'GOLD';

export type AuditScreenAccessOutcome =
  | 'captured'
  | 'fail_closed'
  | 'response_not_json'
  | 'response_too_large'
  | 'invalid_json';

type Labels = Record<string, string>;

interface CounterSample {
  value: number;
  labels: Labels;
}

interface LatencySummary {
  count: number;
  sum: number;
  max: number;
  last: number;
}

function labelsKey(labels: Labels): string {
  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('|');
}

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function formatLabels(labels: Labels): string {
  const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));

  if (entries.length === 0) {
    return '';
  }

  return `{${entries.map(([key, value]) => `${key}="${escapeLabelValue(value)}"`).join(',')}}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

export class AuditMetricsRegistry {
  private readonly screenAccessTotals = new Map<string, CounterSample>();

  private readonly snapshotBytes = new Map<string, CounterSample>();

  private readonly failClosedTotals = new Map<string, CounterSample>();

  private publishLatency: LatencySummary = {
    count: 0,
    sum: 0,
    max: 0,
    last: 0,
  };

  recordScreenAccess(level: AuditMetricLevel, outcome: AuditScreenAccessOutcome, screenId: string): void {
    this.incrementCounter(this.screenAccessTotals, { level, outcome, screenId }, 1);
  }

  recordSnapshotBytes(screenId: string, bytes: number | undefined): void {
    if (!bytes || bytes <= 0) {
      return;
    }

    this.incrementCounter(this.snapshotBytes, { screenId }, bytes);
  }

  recordPublishLatency(latencyMs: number): void {
    if (!Number.isFinite(latencyMs) || latencyMs < 0) {
      return;
    }

    this.publishLatency = {
      count: this.publishLatency.count + 1,
      sum: this.publishLatency.sum + latencyMs,
      max: Math.max(this.publishLatency.max, latencyMs),
      last: latencyMs,
    };
  }

  recordFailClosed(level: AuditMetricLevel): void {
    this.incrementCounter(this.failClosedTotals, { level }, 1);
  }

  renderPrometheus(): string {
    const lines: string[] = [
      '# HELP bff_audit_screen_access_total Total de capturas de SCREEN_ACCESS por tela, nivel e resultado.',
      '# TYPE bff_audit_screen_access_total counter',
      ...this.renderCounter('bff_audit_screen_access_total', this.screenAccessTotals),
      '# HELP bff_audit_snapshot_bytes Bytes acumulados de snapshots Ouro capturados pelo BFF.',
      '# TYPE bff_audit_snapshot_bytes counter',
      ...this.renderCounter('bff_audit_snapshot_bytes', this.snapshotBytes),
      '# HELP bff_audit_publish_latency_ms Latencia de publicacao dos eventos SCREEN_ACCESS no servico de auditoria.',
      '# TYPE bff_audit_publish_latency_ms summary',
      `bff_audit_publish_latency_ms_count ${formatNumber(this.publishLatency.count)}`,
      `bff_audit_publish_latency_ms_sum ${formatNumber(this.publishLatency.sum)}`,
      `bff_audit_publish_latency_ms${formatLabels({ stat: 'last' })} ${formatNumber(this.publishLatency.last)}`,
      `bff_audit_publish_latency_ms${formatLabels({ stat: 'max' })} ${formatNumber(this.publishLatency.max)}`,
      '# HELP bff_audit_fail_closed_total Total de respostas fail-closed por nivel de auditoria.',
      '# TYPE bff_audit_fail_closed_total counter',
      ...this.renderCounter('bff_audit_fail_closed_total', this.failClosedTotals),
    ];

    return `${lines.join('\n')}\n`;
  }

  private incrementCounter(samples: Map<string, CounterSample>, labels: Labels, amount: number): void {
    const key = labelsKey(labels);
    const current = samples.get(key);

    if (current) {
      current.value += amount;
      return;
    }

    samples.set(key, {
      value: amount,
      labels,
    });
  }

  private renderCounter(name: string, samples: Map<string, CounterSample>): string[] {
    return Array.from(samples.values())
      .sort((left, right) => labelsKey(left.labels).localeCompare(labelsKey(right.labels)))
      .map((sample) => `${name}${formatLabels(sample.labels)} ${formatNumber(sample.value)}`);
  }
}
