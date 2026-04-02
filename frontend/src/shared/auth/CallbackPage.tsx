import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loading } from '@components/ui/loading';
import { userManager } from './authConfig';

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
        await userManager.signinRedirectCallback();
        const returnUrl = sessionStorage.getItem('returnUrl') || '/';
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