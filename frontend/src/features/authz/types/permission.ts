export type PermissionStatus = 'ACTIVE' | 'DEPRECATED' | 'DISABLED';

export interface PermissionSummary {
  id: string;
  key: string;
  displayName: string;
  domain?: string;
  area?: string;
  status: PermissionStatus;
}

export interface Permission extends PermissionSummary {
  description?: string | null;
  domain: string;
  area: string;
  resource: string;
  action: string;
  serviceName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionPage {
  content: PermissionSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PermissionFilters {
  domain: string;
  area: string;
  service: string;
  status: '' | PermissionStatus;
  q: string;
}
