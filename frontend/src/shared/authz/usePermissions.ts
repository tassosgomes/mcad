import { useContext } from 'react';
import { PermissionsContext } from './PermissionsProvider';
import type { PermissionsState } from './types';

export function usePermissions(): PermissionsState {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }

  return context;
}
