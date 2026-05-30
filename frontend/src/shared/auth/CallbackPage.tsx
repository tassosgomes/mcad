import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loading } from '@components/ui/loading';
import { fetchPermissions } from '@shared/authz/permissionsApi';
import { userManager } from './authConfig';
import { resolveAuthorizedReturnPath } from './authorizedRoutes';

let activeCallbackUrl: string | null = null;

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
        const permissions = user.access_token
          ? (await fetchPermissions({ token: user.access_token })).data.permissions
          : [];
        const returnUrl = resolveAuthorizedReturnPath(sessionStorage.getItem('returnUrl'), permissions);
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
