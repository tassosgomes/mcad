import { Routes, Route } from 'react-router-dom';
import { LicencasPage } from './licencas/pages/LicencasPage';
import { LicencaCreatePage } from './licencas/pages/LicencaCreatePage';
import { LicencaDetailPage } from './licencas/pages/LicencaDetailPage';

export default function ArrecadacaoRoutes() {
  return (
    <Routes>
      <Route path="licencas" element={<LicencasPage />} />
      <Route path="licencas/nova" element={<LicencaCreatePage />} />
      <Route path="licencas/:id" element={<LicencaDetailPage />} />
    </Routes>
  );
}
