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

export interface LinkedRole {
  id: string;
  key: string;
  displayName: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface PermissionRemovalEligibility {
  permissionId: string;
  permissionStatus: PermissionStatus;
  linkedRoles: LinkedRole[];
  canRemove: boolean;
  blockingReason?: 'STATUS_NOT_DEPRECATED' | 'ROLE_LINKS_PRESENT';
}

export interface CreatePermissionInput {
  key: string;
  displayName: string;
  description?: string | null;
  domain: string;
  area: string;
  resource: string;
  action: string;
}
