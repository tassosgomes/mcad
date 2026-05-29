import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bffDelete, bffGet, bffPost } from '@services/apiBffClient';

export interface AssignmentRole {
  assignmentId?: string;
  key: string;
  domain: string;
  displayName: string;
}

export interface Assignment {
  subject: string;
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
  key: string;
  domain: string;
  displayName: string;
  description?: string | null;
  status?: string;
}

interface RolePageResponse {
  items?: Papel[];
  content?: Papel[];
}

export interface AssignmentsQuery {
  page?: number;
  size?: number;
  query?: string;
}

export interface AtribuirPapelInput {
  userId: string;
  roleKey: string;
}

export interface RemoverPapelInput {
  assignmentId: string;
}

const assignmentsQueryKey = ['acessos', 'assignments'] as const;
const papeisQueryKey = ['acessos', 'papeis'] as const;

function buildAssignmentsPath(params: AssignmentsQuery): string {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 0));
  query.set('size', String(params.size ?? 50));

  const search = params.query?.trim();
  if (search) {
    query.set('query', search);
  }

  return `/acessos/assignments?${query.toString()}`;
}

function normalizePapeis(response: Papel[] | RolePageResponse): Papel[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response.items ?? response.content ?? [];
}

export function useAssignments(params: AssignmentsQuery) {
  return useQuery({
    queryKey: [...assignmentsQueryKey, params],
    queryFn: () => bffGet<AssignmentsPage>(buildAssignmentsPath(params)),
  });
}

export function usePapeis() {
  return useQuery({
    queryKey: papeisQueryKey,
    queryFn: async () => normalizePapeis(await bffGet<Papel[] | RolePageResponse>('/acessos/papeis')),
  });
}

export function useAtribuirPapel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AtribuirPapelInput) =>
      bffPost<void>('/acessos/papeis/atribuir', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assignmentsQueryKey });
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
    },
  });
}
