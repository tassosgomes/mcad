import { Route, Routes } from 'react-router-dom';
import { AuditDashboardPage } from './pages/AuditDashboardPage';
import { AuditReportsPage } from './pages/AuditReportsPage';
import { AuditTimelinePage } from './pages/AuditTimelinePage';
import { ScreenAccessPage } from './pages/ScreenAccessPage';

export default function AuditoriaRoutes() {
  return (
    <Routes>
      <Route index element={<AuditDashboardPage />} />
      <Route path="eventos" element={<AuditTimelinePage />} />
      <Route path="acessos" element={<ScreenAccessPage />} />
      <Route path="relatorios" element={<AuditReportsPage />} />
    </Routes>
  );
}
