import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuditMetricsRegistry } from './auditMetrics.js';

test('AuditMetricsRegistry renders required audit metrics in Prometheus format', () => {
  const metrics = new AuditMetricsRegistry();

  metrics.recordScreenAccess('GOLD', 'captured', 'cadastro.titulares.lista');
  metrics.recordSnapshotBytes('cadastro.titulares.lista', 1234);
  metrics.recordPublishLatency(42.25);
  metrics.recordScreenAccess('GOLD', 'fail_closed', 'cadastro.titulares.lista');
  metrics.recordFailClosed('GOLD');

  const output = metrics.renderPrometheus();

  assert.match(
    output,
    /bff_audit_screen_access_total\{level="GOLD",outcome="captured",screenId="cadastro\.titulares\.lista"\} 1/,
  );
  assert.match(output, /bff_audit_snapshot_bytes\{screenId="cadastro\.titulares\.lista"\} 1234/);
  assert.match(output, /bff_audit_publish_latency_ms_count 1/);
  assert.match(output, /bff_audit_publish_latency_ms_sum 42\.25/);
  assert.match(output, /bff_audit_fail_closed_total\{level="GOLD"\} 1/);
});
