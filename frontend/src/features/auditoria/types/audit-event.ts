export type AuditEventType = 'DATA_CHANGE' | 'SCREEN_ACCESS' | 'USER_ACTION';
export type AuditDataAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditReportType = 'DATA_CHANGE' | 'SCREEN_ACCESS' | 'MIXED';
export type AuditReportStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED';
export type AuditLevel = 'BRONZE' | 'SILVER' | 'GOLD';

export interface AuditActorSummary {
  userId?: string | null;
  username?: string | null;
  displayName?: string | null;
}

export interface AuditScreenSummary {
  screenId?: string | null;
  screenName?: string | null;
  domain?: string | null;
  auditLevel?: AuditLevel | string | null;
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
  domain?: string | null;
  auditLevel?: AuditLevel | string | null;
  businessContext?: Record<string, unknown> | null;
}

export interface AuditCatalogSummary {
  screenId: string;
  aliases: string[];
  domain: string;
  friendlyName: string;
  level: AuditLevel;
  justification: string;
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
  catalog?: AuditCatalogSummary | null;
}

export interface AuditEventListItem {
  eventId: string;
  eventType: AuditEventType;
  occurredAt: string;
  actor?: AuditActorSummary | null;
  origin?: AuditOrigin | null;
  screen?: AuditScreenAccess | null;
  data?: AuditData | null;
  action?: AuditUserAction | null;
  correlation?: AuditCorrelation | null;
  metadata?: Record<string, unknown> | null;
  catalog?: AuditCatalogSummary | null;
}

export interface AuditEventsResponse {
  page: number;
  size: number;
  items: AuditEventListItem[];
  meta?: Record<string, unknown>;
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
  reportType?: AuditReportType | string;
  status: AuditReportStatus;
  requestedBy?: string;
  requestedAtUtc?: string;
  fromUtc?: string;
  toUtc?: string;
  errorMessage?: string | null;
}

export interface AuditReportStatusResponse {
  reportId: string;
  reportType?: AuditReportType | string;
  status: AuditReportStatus;
  requestedBy?: string;
  requestedAtUtc?: string;
  fromUtc?: string;
  toUtc?: string;
  errorMessage?: string | null;
}

export interface AuditCatalogItem {
  id: string;
  aliases: string[];
  domain: 'cadastro' | 'identificacao' | 'arrecadacao' | 'distribuicao' | 'auditoria';
  friendlyName: string;
  routePatterns: string[];
  methods: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>;
  level: AuditLevel;
  justification: string;
  owner?: string;
  approvedBy?: string;
  approvedAt?: string;
  changeReason?: string;
  retentionDays?: number;
}

export interface AuditCatalogResponse {
  version: string;
  items: AuditCatalogItem[];
}
