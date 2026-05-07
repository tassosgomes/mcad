import { useEffect } from 'react';
import type { User } from 'oidc-client-ts';
import { useNavigate } from 'react-router-dom';
import { Loading } from '@components/ui/loading';
import { userManager } from './authConfig';
import { resolveAuthorizedReturnPath } from './authorizedRoutes';

let activeCallbackUrl: string | null = null;

function extractRoles(user: User | null): string[] {
  const roles = user?.profile?.roles;

  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.filter((role): role is string => typeof role === 'string');
}

export function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const callbackUrl = window.location.href;

      if (activeCallbackUrl === callbackUrl) {
        return;
      }

      activeCallbackUrl = callbackUrl;

      try {
        const user = await userManager.signinRedirectCallback();
        const returnUrl = resolveAuthorizedReturnPath(
          sessionStorage.getItem('returnUrl'),
          extractRoles(user)
        );
        sessionStorage.removeItem('returnUrl');
        navigate(returnUrl, { replace: true });
      } catch (error) {
        activeCallbackUrl = null;
        throw error;
      }
    };

    void handleCallback();
  }, [navigate]);

  return <Loading />;
}
