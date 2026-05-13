import { redactSensitiveData } from '../security/redaction.js';

export interface AuditRecord {
  requestId: string;
  userId: string;
  eventType: 'chat' | 'tool' | 'workflow';
  target: string;
  status: 'success' | 'denied' | 'error' | 'suspended';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const auditRecords: AuditRecord[] = [];

export function recordAuditEvent(record: Omit<AuditRecord, 'createdAt'>): AuditRecord {
  const sanitizedRecord: AuditRecord = {
    ...record,
    metadata: record.metadata ? redactSensitiveData(record.metadata) : undefined,
    createdAt: new Date().toISOString(),
  };

  auditRecords.push(sanitizedRecord);

  return sanitizedRecord;
}

export function listAuditEvents(): AuditRecord[] {
  return auditRecords.map((record) => ({ ...record }));
}

export function resetAuditEvents(): void {
  auditRecords.length = 0;
}
