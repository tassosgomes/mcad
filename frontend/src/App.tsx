import { RouterProvider } from 'react-router-dom';
import { router } from './app/router/routes';
import { AppProviders } from './app/providers/AppProviders';
import { ToastProvider } from '@components/ui/toast';

function App() {
  return (
    <AppProviders>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AppProviders>
  );
}

export default App;
