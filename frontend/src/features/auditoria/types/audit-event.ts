export type AuditEventType = 'DATA_CHANGE' | 'SCREEN_ACCESS' | 'USER_ACTION';
export type AuditDataAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditReportType = 'DATA_CHANGE' | 'SCREEN_ACCESS' | 'MIXED';
export type AuditReportStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED';

export interface AuditActorSummary {
  userId?: string | null;
  username?: string | null;
  displayName?: string | null;
}

export interface AuditScreenSummary {
  screenId?: string | null;
  screenName?: string | null;
}

export interface AuditCorrelation {
  screenAccessId?: string | null;
  commandId?: string | null;
  traceId?: string | null;
  requestId?: string | null;
  userSessionId?: string | null;
}

export interface AuditChangedField {
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface AuditTimelineItem {
  eventId: string;
  eventType: AuditEventType;
  occurredAt: string;
  actor?: AuditActorSummary | null;
  screen?: AuditScreenSummary | null;
  action?: string | null;
  summary?: string | null;
  changedFields?: AuditChangedField[];
  correlation?: AuditCorrelation | null;
}

export interface AuditTimelineResponse {
  entityType: string;
  entityId: string;
  page: number;
  size: number;
  items: AuditTimelineItem[];
}

export interface AuditSource {
  service?: string | null;
  system?: string | null;
  schema?: string | null;
  environment?: string | null;
}

export interface AuditOrigin {
  channel?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  route?: string | null;
  screenId?: string | null;
  screenName?: string | null;
}

export interface AuditData {
  entityType?: string | null;
  entityId?: string | null;
  entityVersion?: number | null;
  action?: AuditDataAction | string | null;
  before?: unknown;
  after?: unknown;
  changedFields?: AuditChangedField[];
}

export interface AuditUserAction {
  name?: string | null;
  label?: string | null;
  businessContext?: Record<string, unknown> | null;
}

export interface AuditScreenAccess {
  screenId?: string | null;
  screenName?: string | null;
  businessContext?: Record<string, unknown> | null;
}

export interface AuditEventDetail {
  eventId: string;
  schemaVersion: number;
  eventType: AuditEventType;
  occurredAt: string;
  source?: AuditSource | null;
  actor?: AuditActorSummary | null;
  origin?: AuditOrigin | null;
  correlation?: AuditCorrelation | null;
  data?: AuditData | null;
  screen?: AuditScreenAccess | null;
  action?: AuditUserAction | null;
  metadata?: Record<string, unknown> | null;
  security?: Record<string, unknown> | null;
}

export interface ScreenAccessItem {
  eventId: string;
  occurredAt: string;
  actor?: AuditActorSummary | null;
  origin?: AuditOrigin | null;
  screen?: AuditScreenAccess | null;
  correlation?: AuditCorrelation | null;
}

export interface ScreenAccessResponse {
  page: number;
  size: number;
  items: ScreenAccessItem[];
}

export interface CreateAuditReportRequest {
  reportType: AuditReportType;
  from: string;
  to: string;
  filters: {
    entityType?: string;
    actorUserId?: string;
    screenId?: string;
  };
  format: 'PDF';
}

export interface CreateAuditReportResponse {
  reportId: string;
  status: AuditReportStatus;
}

export interface AuditReportStatusResponse {
  reportId: string;
  status: AuditReportStatus;
  requestedAt?: string;
  finishedAt?: string | null;
  downloadUrl?: string | null;
  errorMessage?: string | null;
}
