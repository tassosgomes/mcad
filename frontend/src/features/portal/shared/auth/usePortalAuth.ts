import { useContext } from 'react';
import { PortalAuthContext } from './PortalAuthContext';

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);

  if (!context) {
    throw new Error('usePortalAuth must be used within a PortalAuthProvider');
  }

  return context;
}
