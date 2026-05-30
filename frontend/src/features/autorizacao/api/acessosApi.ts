import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bffDelete, bffGet, bffPost } from '@services/apiBffClient';
import { PERMISSIONS_QUERY_KEY } from '@shared/authz/PermissionsProvider';

export interface AssignmentRole {
  assignmentId?: string;
  key: string;
  roleId?: string;
  domain: string;
  displayName: string;
}

export interface Assignment {
  subject: string;
  userId?: string;
  email?: string;
  name?: string;
  roles: AssignmentRole[];
}

export interface AssignmentsPage {
  items: Assignment[];
  page: number;
  size: number;
  total: number;
}

export interface Papel {
  id?: string;
  key: string;
  domain: string;
  displayName: string;
  description?: string | null;
  area?: string;
  type?: string;
  status?: string;
  critical?: boolean;
}

export interface AcessoUsuario {
  id: string;
  subject: string;
  email?: string;
  name?: string;
  status?: string;
}

export interface UsuariosPage {
  items: AcessoUsuario[];
  page: number;
  size: number;
  total: number;
}

export interface AssignmentAuditItem {
  id: string;
  occurredAt: string;
  actorSubject?: string;
  subject?: string;
  targetUserId?: string;
  roleKey?: string;
  action?: 'ASSIGNED' | 'REMOVED' | string;
  correlationId?: string;
}

interface RolePageResponse {
  items?: Papel[];
  content?: Papel[];
}

interface HistoryPageResponse {
  items?: AssignmentAuditItem[];
  content?: AssignmentAuditItem[];
  events?: AssignmentAuditItem[];
  page?: number;
  size?: number;
  total?: number;
  totalElements?: number;
}

export interface AssignmentsQuery {
  page?: number;
  size?: number;
  query?: string;
}

export interface UsuariosQuery {
  page?: number;
  size?: number;
  query?: string;
}

export interface PapeisQuery {
  page?: number;
  size?: number;
  domain?: string;
  type?: string;
  status?: string;
}

export interface AssignmentHistoryQuery {
  page?: number;
  size?: number;
  userId?: string;
  roleKey?: string;
}

export interface AtribuirPapelInput {
  userId: string;
  roleKey: string;
}

export interface RemoverPapelInput {
  assignmentId: string;
}

const assignmentsQueryKey = ['acessos', 'assignments'] as const;
const usuariosQueryKey = ['acessos', 'usuarios'] as const;
const papeisQueryKey = ['acessos', 'papeis'] as const;
const historyQueryKey = ['acessos', 'atribuicoes', 'historico'] as const;

function buildQueryPath(basePath: string, params: Record<string, unknown>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    query.set(key, String(value));
  }

  const search = query.toString();
  return search ? `${basePath}?${search}` : basePath;
}

function buildAssignmentsPath(params: AssignmentsQuery): string {
  return buildQueryPath('/acessos/assignments', {
    page: params.page ?? 0,
    size: params.size ?? 50,
    query: params.query?.trim(),
  });
}

function buildUsuariosPath(params: UsuariosQuery): string {
  return buildQueryPath('/acessos/usuarios', {
    page: params.page ?? 0,
    size: params.size ?? 10,
    query: params.query?.trim(),
  });
}

function buildPapeisPath(params: PapeisQuery): string {
  return buildQueryPath('/acessos/papeis', {
    page: params.page ?? 0,
    size: params.size ?? 200,
    domain: params.domain,
    type: params.type,
    status: params.status,
  });
}

function buildHistoryPath(params: AssignmentHistoryQuery): string {
  return buildQueryPath('/acessos/atribuicoes/historico', {
    page: params.page ?? 0,
    size: params.size ?? 10,
    userId: params.userId,
    roleKey: params.roleKey,
  });
}

function normalizePapeis(response: Papel[] | RolePageResponse): Papel[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response.items ?? response.content ?? [];
}

function normalizeHistory(response: HistoryPageResponse): HistoryPageResponse & { items: AssignmentAuditItem[] } {
  const items = response.items ?? response.content ?? response.events ?? [];

  return {
    ...response,
    items,
    page: response.page ?? 0,
    size: response.size ?? items.length,
    total: response.total ?? response.totalElements ?? items.length,
  };
}

export function useAssignments(params: AssignmentsQuery) {
  return useQuery({
    queryKey: [...assignmentsQueryKey, params],
    queryFn: () => bffGet<AssignmentsPage>(buildAssignmentsPath(params)),
  });
}

export function useUsuarios(params: UsuariosQuery, enabled = true) {
  return useQuery({
    queryKey: [...usuariosQueryKey, params],
    enabled,
    queryFn: () => bffGet<UsuariosPage>(buildUsuariosPath(params)),
  });
}

export function usePapeis(params: PapeisQuery = {}) {
  return useQuery({
    queryKey: [...papeisQueryKey, params],
    queryFn: async () => normalizePapeis(await bffGet<Papel[] | RolePageResponse>(buildPapeisPath(params))),
  });
}

export function useAssignmentHistory(params: AssignmentHistoryQuery, enabled = true) {
  return useQuery({
    queryKey: [...historyQueryKey, params],
    enabled,
    queryFn: async () => normalizeHistory(await bffGet<HistoryPageResponse>(buildHistoryPath(params))),
  });
}

export function useAtribuirPapel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AtribuirPapelInput) =>
      bffPost<void>('/acessos/papeis/atribuir', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assignmentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: historyQueryKey });
      void queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY });
    },
  });
}

export function useRemoverPapel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoverPapelInput) =>
      bffDelete(`/acessos/papeis/atribuir/${encodeURIComponent(input.assignmentId)}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assignmentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: historyQueryKey });
      void queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY });
    },
  });
}
