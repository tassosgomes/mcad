import { RouterProvider } from 'react-router-dom';
import { router } from './app/router/routes';
import { AppProviders } from './app/providers/AppProviders';

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

export default App;
