import { Navigate, Route, Routes } from 'react-router-dom';
import { AuditReportsPage } from './pages/AuditReportsPage';
import { AuditTimelinePage } from './pages/AuditTimelinePage';
import { ScreenAccessPage } from './pages/ScreenAccessPage';

export default function AuditoriaRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="eventos" replace />} />
      <Route path="eventos" element={<AuditTimelinePage />} />
      <Route path="acessos" element={<ScreenAccessPage />} />
      <Route path="relatorios" element={<AuditReportsPage />} />
    </Routes>
  );
}
