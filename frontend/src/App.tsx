import { RouterProvider } from 'react-router-dom';
import { router } from './app/router/routes';
import { AppProviders } from './app/providers/AppProviders';
import { ToastProvider } from '@components/ui/toast';
import { AuthProvider } from '@shared/auth';

function App() {
  return (
    <AuthProvider>
      <AppProviders>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AppProviders>
    </AuthProvider>
  );
}

export default App;
