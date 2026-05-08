import { BASE_URL, apiGetAudit, apiPostAudit } from '@services/apiAuditoriaClient';
import type {
  AuditEventDetail,
  AuditTimelineItem,
  AuditTimelineResponse,
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

export function getAuditReportPdfUrl(reportId: string): string {
  return `${BASE_URL}/audit/reports/${encodeURIComponent(reportId)}/pdf`;
}

export async function getAuditTimeline(params: AuditTimelineParams): Promise<AuditTimelineResponse> {
  const { entityType, entityId, from, to, page = 0, size = 20, eventType } = params;
  const searchParams = compactParams({ from, to, limit: size, eventType });

  const response = await apiGetAudit<AuditTimelineApiResponse>(
    `/audit/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/timeline?${searchParams.toString()}`,
  );

  return normalizeTimelineResponse(response, { entityType, entityId, page, size });
}

export async function getAuditEvent(eventId: string): Promise<AuditEventDetail> {
  return apiGetAudit<AuditEventDetail>(`/audit/events/${encodeURIComponent(eventId)}`);
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

  const response = await apiGetAudit<ScreenAccessApiResponse>(
    `/audit/screen-access?${searchParams.toString()}`,
  );

  return normalizeScreenAccessResponse(response, { page, size });
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

function getResponseItems<T>(response: T[] | { items?: T[] }): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  return Array.isArray(response.items) ? response.items : [];
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
  item: AuditTimelineItem | ScreenAccessItem | AuditEventViewApiItem,
): item is AuditEventViewApiItem {
  return 'payload' in item || 'occurredAtUtc' in item;
}
