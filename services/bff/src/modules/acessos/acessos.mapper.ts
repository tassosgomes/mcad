import { buildAssignmentId } from './assignmentId.js';

export interface UserSummary {
  id: string;
  subject: string;
  email?: string;
  name?: string;
  status?: string;
}

export interface RoleCatalogItem {
  [key: string]: unknown;
  id: string;
  key: string;
  domain: string;
  displayName: string;
  description?: string;
  area?: string;
  type?: string;
  status?: string;
  critical: boolean;
}

export interface AssignmentRole {
  assignmentId: string;
  key: string;
  roleId: string;
  domain: string;
  displayName: string;
}

export interface AssignmentItem extends UserSummary {
  userId: string;
  roles: AssignmentRole[];
}

export function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function getNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function getPageContent(body: unknown): unknown[] {
  const record = asRecord(body);
  if (!record) return [];
  if (Array.isArray(record.content)) return record.content;
  if (Array.isArray(record.items)) return record.items;
  return [];
}

export function getPageNumber(body: unknown, field: 'page' | 'size', fallback: number): number {
  const record = asRecord(body);
  return record ? getNumber(record[field], fallback) : fallback;
}

export function getTotal(body: unknown): number {
  const record = asRecord(body);
  if (!record) return 0;
  return getNumber(record.totalElements, getNumber(record.total, getPageContent(body).length));
}

export function toUserSummary(value: unknown): UserSummary | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const id = getString(record.id);
  if (!id) return undefined;

  return {
    id,
    subject: getString(record.subject) ?? id,
    email: getString(record.email),
    name: getString(record.name),
    status: getString(record.status),
  };
}

export function roleDomainFromKey(roleKey: string): string {
  return roleKey.split('.')[0] ?? 'unknown';
}

export function toRoleCatalogItem(value: unknown): RoleCatalogItem | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const key = getString(record.key) ?? getString(record.roleKey);
  if (!key) return undefined;

  const id = getString(record.id) ?? key;
  const domain = getString(record.domain) ?? roleDomainFromKey(key);
  const displayName = getString(record.displayName) ?? key;
  const critical =
    getBoolean(record.critical) ??
    getBoolean(record.isCritical) ??
    getBoolean(record.sensitive) ??
    false;

  return {
    ...record,
    id,
    key,
    domain,
    displayName,
    description: getString(record.description),
    area: getString(record.area),
    type: getString(record.type) ?? getString(record.roleType),
    status: getString(record.status),
    critical,
  };
}

export function toAssignmentRole(
  value: unknown,
  userId: string,
  rolesByKey: Map<string, RoleCatalogItem>,
): AssignmentRole | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const status = getString(record.status);
  if (status && status !== 'ACTIVE') return undefined;

  const roleKey = getString(record.roleKey) ?? getString(record.key);
  if (!roleKey) return undefined;

  const catalogRole = rolesByKey.get(roleKey);
  const roleId = catalogRole?.id ?? getString(record.roleId) ?? roleKey;
  const domain = catalogRole?.domain ?? roleDomainFromKey(roleKey);

  return {
    assignmentId: buildAssignmentId(userId, roleId),
    key: roleKey,
    roleId,
    domain,
    displayName: catalogRole?.displayName ?? roleKey,
  };
}

export function queryValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function appendAccessQuery(url: URL, query: Record<string, unknown>): void {
  const page = queryValue(query.page);
  const size = queryValue(query.size);
  const search = queryValue(query.query);
  const sort = queryValue(query.sort);

  if (page) url.searchParams.set('page', page);
  if (size) url.searchParams.set('size', size);
  if (search) url.searchParams.set('q', search);
  if (sort) url.searchParams.set('sort', sort);
}

export function normalizeUserSearch(body: unknown, fallbackPage: number, fallbackSize: number) {
  return {
    items: getPageContent(body).map(toUserSummary).filter(isDefined),
    page: getPageNumber(body, 'page', fallbackPage),
    size: getPageNumber(body, 'size', fallbackSize),
    total: getTotal(body),
  };
}

function roleMatchesFilters(role: RoleCatalogItem, query: Record<string, unknown>): boolean {
  const domain = queryValue(query.domain);
  const type = queryValue(query.type);
  const status = queryValue(query.status);

  return (
    (!domain || role.domain === domain) &&
    (!type || role.type === type) &&
    (!status || role.status === status)
  );
}

export function normalizeRolesPage(body: unknown, query: Record<string, unknown>): unknown {
  if (Array.isArray(body)) {
    return body.map(toRoleCatalogItem).filter(isDefined).filter((role) => roleMatchesFilters(role, query));
  }

  const record = asRecord(body);
  if (!record) return body;

  const contentKey = Array.isArray(record.content) ? 'content' : Array.isArray(record.items) ? 'items' : undefined;
  if (!contentKey) return body;

  const roles = (record[contentKey] as unknown[])
    .map(toRoleCatalogItem)
    .filter(isDefined)
    .filter((role) => roleMatchesFilters(role, query));

  return {
    ...record,
    [contentKey]: roles,
    total: getNumber(record.total, roles.length),
    totalElements: getNumber(record.totalElements, roles.length),
  };
}

export function mapUpstreamErrorBody(body: unknown, fallbackCode: string): { code: string; message?: string } {
  const record = asRecord(body);
  const code = getString(record?.code) ?? fallbackCode;
  const message = getString(record?.message);
  return { code, ...(message ? { message } : {}) };
}
