import { useEffect } from 'react';
import { Loading } from '@components/ui/loading';
import { userManager } from './authConfig';

export function SilentCallbackPage() {
  useEffect(() => {
    void userManager.signinSilentCallback();
  }, []);

  return <Loading />;
}