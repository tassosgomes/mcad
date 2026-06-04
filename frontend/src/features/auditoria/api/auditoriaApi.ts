import { BASE_URL, apiGetAudit, apiGetAuditBlob, apiPostAudit } from '@services/apiAuditoriaClient';
import { bffGet } from '@services/apiBffClient';
import type {
  AuditCatalogResponse,
  AuditEventDetail,
  AuditEventListItem,
  AuditEventsResponse,
  AuditTimelineItem,
  AuditTimelineResponse,
  AuditLevel,
  CreateAuditReportRequest,
  CreateAuditReportResponse,
  ScreenAccessItem,
  ScreenAccessResponse,
  AuditReportStatusResponse,
} from '../types/audit-event';
import { compactParams } from '../utils/auditFormatters';

export interface AuditTimelineParams {
  entityType: string;
  entityId: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  eventType?: string;
}

export interface ScreenAccessParams {
  userId?: string;
  screenId?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface AuditEventsParams {
  userId?: string;
  screenId?: string;
  entityType?: string;
  entityId?: string;
  context?: string;
  from?: string;
  to?: string;
  auditLevel?: AuditLevel | '';
  eventType?: 'SCREEN_ACCESS' | 'USER_ACTION' | 'DATA_CHANGE' | 'MIXED' | '';
  page?: number;
  size?: number;
}

interface AuditEventViewApiItem {
  eventId: string;
  eventType: AuditTimelineItem['eventType'];
  occurredAtUtc: string;
  actorUserId?: string | null;
  actorUsername?: string | null;
  screenId?: string | null;
  screenName?: string | null;
  payload?: AuditEventDetail | null;
}

type AuditTimelineApiResponse = AuditTimelineResponse | Array<AuditTimelineItem | AuditEventViewApiItem>;
type ScreenAccessApiResponse = ScreenAccessResponse | Array<ScreenAccessItem | AuditEventViewApiItem>;
type AuditEventsApiResponse =
  | AuditEventsResponse
  | AuditEventListItem[]
  | { items?: Array<AuditEventListItem | AuditEventViewApiItem>; events?: Array<AuditEventListItem | AuditEventViewApiItem>; data?: Array<AuditEventListItem | AuditEventViewApiItem>; page?: number; size?: number; _meta?: Record<string, unknown> };

export function getAuditReportPdfUrl(reportId: string): string {
  return `${BASE_URL}/audit/reports/${encodeURIComponent(reportId)}/file`;
}

export interface AuditReportPdf {
  blob: Blob;
  filename: string;
}

export async function downloadAuditReportPdf(reportId: string): Promise<AuditReportPdf> {
  const { blob, filename } = await apiGetAuditBlob(
    `/audit/reports/${encodeURIComponent(reportId)}/file`,
  );
  return {
    blob,
    filename: filename ?? `relatorio-auditoria-${reportId}.pdf`,
  };
}

export async function getAuditTimeline(params: AuditTimelineParams): Promise<AuditTimelineResponse> {
  const { entityType, entityId, from, to, page = 0, size = 20, eventType } = params;
  const searchParams = compactParams({ from, to, limit: size, eventType });

  const response = await bffGet<AuditTimelineApiResponse>(
    `/auditoria/v1/audit/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/timeline?${searchParams.toString()}`,
  );

  return normalizeTimelineResponse(response, { entityType, entityId, page, size });
}

export async function getAuditEvent(eventId: string): Promise<AuditEventDetail> {
  return bffGet<AuditEventDetail>(`/auditoria/eventos/${encodeURIComponent(eventId)}`);
}

export async function getScreenAccess(params: ScreenAccessParams): Promise<ScreenAccessResponse> {
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const searchParams = compactParams({
    userId: params.userId,
    screenId: params.screenId,
    entityType: params.entityType,
    entityId: params.entityId,
    fromUtc: params.from,
    toUtc: params.to,
    limit: size,
  });

  const response = await bffGet<ScreenAccessApiResponse>(
    `/auditoria/v1/audit/screen-access?${searchParams.toString()}`,
  );

  return normalizeScreenAccessResponse(response, { page, size });
}

export async function getAuditCatalog(): Promise<AuditCatalogResponse> {
  return bffGet<AuditCatalogResponse>('/auditoria/catalogo');
}

export async function getAuditEvents(params: AuditEventsParams): Promise<AuditEventsResponse> {
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const searchParams = compactParams({
    userId: params.userId,
    screenId: params.screenId,
    entityType: params.entityType,
    entityId: params.entityId,
    context: params.context,
    from: params.from,
    to: params.to,
    auditLevel: params.auditLevel || undefined,
    eventType: params.eventType || undefined,
    page,
    size,
  });

  const response = await bffGet<AuditEventsApiResponse>(
    `/auditoria/eventos?${searchParams.toString()}`,
  );

  return normalizeAuditEventsResponse(response, { page, size });
}

export async function createAuditReport(
  body: CreateAuditReportRequest,
): Promise<CreateAuditReportResponse> {
  return apiPostAudit<CreateAuditReportResponse>('/audit/reports', body);
}

export async function getAuditReport(reportId: string): Promise<AuditReportStatusResponse> {
  return apiGetAudit<AuditReportStatusResponse>(`/audit/reports/${encodeURIComponent(reportId)}`);
}

function normalizeTimelineResponse(
  response: AuditTimelineApiResponse,
  fallback: Pick<AuditTimelineResponse, 'entityType' | 'entityId' | 'page' | 'size'>,
): AuditTimelineResponse {
  const items = getResponseItems<AuditTimelineItem | AuditEventViewApiItem>(response)
    .map(normalizeTimelineItem);

  if (Array.isArray(response)) {
    return { ...fallback, items };
  }

  return {
    entityType: response.entityType ?? fallback.entityType,
    entityId: response.entityId ?? fallback.entityId,
    page: response.page ?? fallback.page,
    size: response.size ?? fallback.size,
    items,
  };
}

function normalizeScreenAccessResponse(
  response: ScreenAccessApiResponse,
  fallback: Pick<ScreenAccessResponse, 'page' | 'size'>,
): ScreenAccessResponse {
  const items = getResponseItems<ScreenAccessItem | AuditEventViewApiItem>(response)
    .map(normalizeScreenAccessItem);

  if (Array.isArray(response)) {
    return { ...fallback, items };
  }

  return {
    page: response.page ?? fallback.page,
    size: response.size ?? fallback.size,
    items,
  };
}

function normalizeAuditEventsResponse(
  response: AuditEventsApiResponse,
  fallback: Pick<AuditEventsResponse, 'page' | 'size'>,
): AuditEventsResponse {
  const items = getFlexibleResponseItems<AuditEventListItem | AuditEventViewApiItem>(response)
    .map(normalizeAuditEventListItem);

  if (Array.isArray(response)) {
    return { ...fallback, items };
  }

  return {
    page: response.page ?? fallback.page,
    size: response.size ?? fallback.size,
    items,
    meta: getResponseMeta(response),
  };
}

function getResponseItems<T>(response: T[] | { items?: T[] }): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  return Array.isArray(response.items) ? response.items : [];
}

function getFlexibleResponseItems<T>(
  response: T[] | { items?: T[]; events?: T[]; data?: T[] },
): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.events)) return response.events;
  if (Array.isArray(response.data)) return response.data;
  return [];
}

function getResponseMeta(response: AuditEventsApiResponse): Record<string, unknown> | undefined {
  if (Array.isArray(response)) {
    return undefined;
  }

  return '_meta' in response && response._meta ? response._meta : undefined;
}

function normalizeAuditEventListItem(
  item: AuditEventListItem | AuditEventViewApiItem,
): AuditEventListItem {
  if (!isAuditEventViewApiItem(item)) {
    return item;
  }

  const payload = item.payload;

  return {
    eventId: payload?.eventId ?? item.eventId,
    eventType: payload?.eventType ?? item.eventType,
    occurredAt: payload?.occurredAt ?? item.occurredAtUtc,
    actor: payload?.actor ?? {
      userId: item.actorUserId,
      username: item.actorUsername,
      displayName: item.actorUsername,
    },
    origin: payload?.origin ?? {
      screenId: item.screenId,
      screenName: item.screenName,
    },
    screen: payload?.screen ?? {
      screenId: item.screenId,
      screenName: item.screenName,
    },
    data: payload?.data,
    action: payload?.action,
    correlation: payload?.correlation,
    metadata: payload?.metadata,
    catalog: payload?.catalog,
  };
}

function normalizeTimelineItem(item: AuditTimelineItem | AuditEventViewApiItem): AuditTimelineItem {
  if (!isAuditEventViewApiItem(item)) {
    return item;
  }

  const payload = item.payload;

  return {
    eventId: payload?.eventId ?? item.eventId,
    eventType: payload?.eventType ?? item.eventType,
    occurredAt: payload?.occurredAt ?? item.occurredAtUtc,
    actor: payload?.actor ?? {
      userId: item.actorUserId,
      username: item.actorUsername,
      displayName: item.actorUsername,
    },
    screen: payload?.screen ?? {
      screenId: item.screenId,
      screenName: item.screenName,
    },
    action: payload?.data?.action ?? payload?.action?.label ?? payload?.action?.name ?? null,
    summary: payload?.action?.label ?? payload?.data?.action ?? null,
    changedFields: payload?.data?.changedFields,
    correlation: payload?.correlation,
  };
}

function normalizeScreenAccessItem(item: ScreenAccessItem | AuditEventViewApiItem): ScreenAccessItem {
  if (!isAuditEventViewApiItem(item)) {
    return item;
  }

  const payload = item.payload;

  return {
    eventId: payload?.eventId ?? item.eventId,
    occurredAt: payload?.occurredAt ?? item.occurredAtUtc,
    actor: payload?.actor ?? {
      userId: item.actorUserId,
      username: item.actorUsername,
      displayName: item.actorUsername,
    },
    origin: payload?.origin ?? {
      screenId: item.screenId,
      screenName: item.screenName,
    },
    screen: payload?.screen ?? {
      screenId: item.screenId,
      screenName: item.screenName,
    },
    correlation: payload?.correlation,
  };
}

function isAuditEventViewApiItem(
  item: AuditTimelineItem | ScreenAccessItem | AuditEventListItem | AuditEventViewApiItem,
): item is AuditEventViewApiItem {
  return 'payload' in item || 'occurredAtUtc' in item;
}
