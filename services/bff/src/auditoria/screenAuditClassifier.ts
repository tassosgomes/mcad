import {
  AUDIT_CATALOG_VERSION,
  type AuditHttpMethod,
  type AuditLevel,
  type AuditScreenOperation,
  type BusinessContextRule,
  screenAuditCatalog,
} from './screenAuditCatalog.js';

export interface ScreenAuditRequest {
  method: string;
  path: string;
  query?: URLSearchParams | Record<string, string | string[] | undefined>;
  screenIdHint?: string | null;
}

export interface ExtractedBusinessContext {
  auditLevel: AuditLevel;
  catalogVersion: string;
  entityType?: string;
  entityId?: string;
  businessCode?: string;
  filters: Record<string, string | string[]>;
  pagination: {
    page?: string;
    size?: string;
  };
  sorting: string[];
  route: {
    path: string;
    pattern?: string;
    params: Record<string, string>;
  };
}

export interface HintValidationResult {
  status: 'absent' | 'accepted' | 'ignored';
  screenId?: string;
  reason?: 'unknown' | 'route_mismatch' | 'would_reduce_level';
}

export interface ScreenAuditClassification {
  level: AuditLevel;
  operation?: AuditScreenOperation;
  isDefault: boolean;
  matchedRoutePattern?: string;
  routeParams: Record<string, string>;
  hint: HintValidationResult;
  businessContext: ExtractedBusinessContext;
}

interface RouteMatch {
  operation: AuditScreenOperation;
  routePattern: string;
  params: Record<string, string>;
  specificity: number;
}

const AUDIT_LEVEL_RANK: Record<AuditLevel, number> = {
  BRONZE: 0,
  SILVER: 1,
  GOLD: 2,
};

const SUPPORTED_METHODS = new Set<AuditHttpMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function normalizeMethod(method: string): AuditHttpMethod | undefined {
  const normalizedMethod = method.toUpperCase();

  return SUPPORTED_METHODS.has(normalizedMethod as AuditHttpMethod)
    ? normalizedMethod as AuditHttpMethod
    : undefined;
}

function normalizePath(path: string): string {
  const pathname = new URL(path, 'http://mcad-bff.local').pathname;

  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function splitPath(path: string): string[] {
  return normalizePath(path)
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}

function matchRoutePattern(routePattern: string, path: string): Omit<RouteMatch, 'operation'> | undefined {
  const routeSegments = splitPath(routePattern);
  const pathSegments = splitPath(path);

  if (routeSegments.length !== pathSegments.length) {
    return undefined;
  }

  const params: Record<string, string> = {};
  let staticSegments = 0;
  let paramSegments = 0;

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index]!;
    const pathSegment = pathSegments[index]!;

    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = pathSegment;
      paramSegments += 1;
      continue;
    }

    if (routeSegment !== pathSegment) {
      return undefined;
    }

    staticSegments += 1;
  }

  return {
    routePattern,
    params,
    specificity: staticSegments * 10 - paramSegments,
  };
}

function compareMatches(left: RouteMatch, right: RouteMatch): number {
  if (left.specificity !== right.specificity) {
    return right.specificity - left.specificity;
  }

  return AUDIT_LEVEL_RANK[right.operation.level] - AUDIT_LEVEL_RANK[left.operation.level];
}

function findRouteMatches(
  method: AuditHttpMethod | undefined,
  path: string,
  catalog: readonly AuditScreenOperation[],
): RouteMatch[] {
  if (!method) {
    return [];
  }

  const matches: RouteMatch[] = [];

  for (const operation of catalog) {
    if (!operation.methods.includes(method)) {
      continue;
    }

    for (const routePattern of operation.routePatterns) {
      const routeMatch = matchRoutePattern(routePattern, path);

      if (routeMatch) {
        matches.push({
          operation,
          ...routeMatch,
        });
      }
    }
  }

  return matches.sort(compareMatches);
}

function normalizeScreenId(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveAuditOperationByIdOrAlias(
  idOrAlias: string,
  catalog: readonly AuditScreenOperation[] = screenAuditCatalog,
): AuditScreenOperation | undefined {
  const normalizedValue = normalizeScreenId(idOrAlias);

  return catalog.find((operation) =>
    normalizeScreenId(operation.id) === normalizedValue
    || operation.aliases.some((alias) => normalizeScreenId(alias) === normalizedValue),
  );
}

function getFirstDefinedValue(
  names: string[] | undefined,
  routeParams: Record<string, string>,
  query: Record<string, string | string[]>,
): string | undefined {
  for (const name of names ?? []) {
    const routeValue = routeParams[name];

    if (routeValue) {
      return routeValue;
    }

    const queryValue = query[name];

    if (Array.isArray(queryValue)) {
      const firstValue = queryValue.find((value) => value.trim().length > 0);

      if (firstValue) {
        return firstValue;
      }
    } else if (queryValue) {
      return queryValue;
    }
  }

  return undefined;
}

function queryFromPath(path: string): Record<string, string | string[]> {
  const searchParams = new URL(path, 'http://mcad-bff.local').searchParams;
  const query: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    const currentValue = query[key];

    if (Array.isArray(currentValue)) {
      currentValue.push(value);
    } else if (currentValue !== undefined) {
      query[key] = [currentValue, value];
    } else {
      query[key] = value;
    }
  }

  return query;
}

function normalizeQuery(
  path: string,
  query?: URLSearchParams | Record<string, string | string[] | undefined>,
): Record<string, string | string[]> {
  if (!query) {
    return queryFromPath(path);
  }

  if (query instanceof URLSearchParams) {
    const output: Record<string, string | string[]> = {};

    for (const [key, value] of query.entries()) {
      const currentValue = output[key];

      if (Array.isArray(currentValue)) {
        currentValue.push(value);
      } else if (currentValue !== undefined) {
        output[key] = [currentValue, value];
      } else {
        output[key] = value;
      }
    }

    return output;
  }

  return Object.fromEntries(
    Object.entries(query).filter((entry): entry is [string, string | string[]] => entry[1] !== undefined),
  );
}

function extractFilters(
  query: Record<string, string | string[]>,
  rule: BusinessContextRule | undefined,
): Record<string, string | string[]> {
  if (!rule) {
    return {};
  }

  const excludedParams = new Set([
    ...rule.paginationParams.page,
    ...rule.paginationParams.size,
    ...rule.sortingParams,
  ]);

  if (rule.filterParams === 'all') {
    return Object.fromEntries(
      Object.entries(query).filter(([key]) => !excludedParams.has(key)),
    );
  }

  return Object.fromEntries(
    Object.entries(query).filter(([key]) => rule.filterParams !== 'all' && rule.filterParams.includes(key)),
  );
}

function extractPagination(
  query: Record<string, string | string[]>,
  rule: BusinessContextRule | undefined,
): ExtractedBusinessContext['pagination'] {
  return {
    page: getFirstDefinedValue(rule?.paginationParams.page, {}, query),
    size: getFirstDefinedValue(rule?.paginationParams.size, {}, query),
  };
}

function extractSorting(
  query: Record<string, string | string[]>,
  rule: BusinessContextRule | undefined,
): string[] {
  for (const name of rule?.sortingParams ?? []) {
    const value = query[name];

    if (Array.isArray(value)) {
      return value;
    }

    if (value) {
      return [value];
    }
  }

  return [];
}

function extractBusinessContext(
  request: ScreenAuditRequest,
  level: AuditLevel,
  operation: AuditScreenOperation | undefined,
  routePattern: string | undefined,
  routeParams: Record<string, string>,
): ExtractedBusinessContext {
  const query = normalizeQuery(request.path, request.query);
  const rule = operation?.businessContext;

  return {
    auditLevel: level,
    catalogVersion: AUDIT_CATALOG_VERSION,
    entityType: rule?.entityType,
    entityId: getFirstDefinedValue(
      [...(rule?.entityId?.pathParams ?? []), ...(rule?.entityId?.queryParams ?? [])],
      routeParams,
      query,
    ),
    businessCode: getFirstDefinedValue(
      [...(rule?.businessCode?.pathParams ?? []), ...(rule?.businessCode?.queryParams ?? [])],
      routeParams,
      query,
    ),
    filters: extractFilters(query, rule),
    pagination: extractPagination(query, rule),
    sorting: extractSorting(query, rule),
    route: {
      path: normalizePath(request.path),
      pattern: routePattern,
      params: routeParams,
    },
  };
}

function validateHint(
  hint: string | null | undefined,
  routeMatches: RouteMatch[],
  selectedOperation: AuditScreenOperation | undefined,
  catalog: readonly AuditScreenOperation[],
): HintValidationResult {
  if (!hint?.trim()) {
    return { status: 'absent' };
  }

  const hintedOperation = resolveAuditOperationByIdOrAlias(hint, catalog);

  if (!hintedOperation) {
    return {
      status: 'ignored',
      screenId: hint,
      reason: 'unknown',
    };
  }

  const isHintAllowedForRoute = routeMatches.some((match) => match.operation.id === hintedOperation.id);

  if (!isHintAllowedForRoute) {
    return {
      status: 'ignored',
      screenId: hintedOperation.id,
      reason: 'route_mismatch',
    };
  }

  if (
    selectedOperation
    && AUDIT_LEVEL_RANK[hintedOperation.level] < AUDIT_LEVEL_RANK[selectedOperation.level]
  ) {
    return {
      status: 'ignored',
      screenId: hintedOperation.id,
      reason: 'would_reduce_level',
    };
  }

  return {
    status: 'accepted',
    screenId: hintedOperation.id,
  };
}

export function classifyScreenAuditRequest(
  request: ScreenAuditRequest,
  catalog: readonly AuditScreenOperation[] = screenAuditCatalog,
): ScreenAuditClassification {
  const method = normalizeMethod(request.method);
  const routeMatches = findRouteMatches(method, request.path, catalog);
  const selectedMatch = routeMatches[0];
  const level = selectedMatch?.operation.level ?? 'BRONZE';
  const routeParams = selectedMatch?.params ?? {};
  const matchedRoutePattern = selectedMatch?.routePattern;
  const hint = validateHint(request.screenIdHint, routeMatches, selectedMatch?.operation, catalog);

  return {
    level,
    operation: selectedMatch?.operation,
    isDefault: !selectedMatch,
    matchedRoutePattern,
    routeParams,
    hint,
    businessContext: extractBusinessContext(
      request,
      level,
      selectedMatch?.operation,
      matchedRoutePattern,
      routeParams,
    ),
  };
}
