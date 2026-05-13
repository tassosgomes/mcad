export type RoleStatus = 'ACTIVE' | 'INACTIVE';

export interface RoleSummary {
  id: string;
  key: string;
  displayName: string;
  domain: string;
  area?: string | null;
  status: RoleStatus;
}

export interface Role extends RoleSummary {
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RolePage {
  content: RoleSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface RoleFilters {
  domain: string;
  area: string;
  status: '' | RoleStatus;
  q: string;
}

export interface RoleCreateRequest {
  key: string;
  displayName: string;
  description?: string | null;
  domain: string;
  area?: string | null;
}
