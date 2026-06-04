import { Route, Routes } from 'react-router-dom';
import { AUDITORIA_PERMISSIONS, RequirePermission } from '@shared/auth';
import { AuditCatalogPage } from './pages/AuditCatalogPage';
import { AuditDashboardPage } from './pages/AuditDashboardPage';
import { AuditReportsPage } from './pages/AuditReportsPage';
import { AuditTimelinePage } from './pages/AuditTimelinePage';
import { ScreenAccessPage } from './pages/ScreenAccessPage';

export default function AuditoriaRoutes() {
  return (
    <Routes>
      <Route index element={<AuditDashboardPage />} />
      <Route
        path="catalogo"
        element={(
          <RequirePermission permission={AUDITORIA_PERMISSIONS.catalogView}>
            <AuditCatalogPage />
          </RequirePermission>
        )}
      />
      <Route
        path="eventos"
        element={(
          <RequirePermission permission={AUDITORIA_PERMISSIONS.eventList}>
            <AuditTimelinePage />
          </RequirePermission>
        )}
      />
      <Route
        path="acessos"
        element={(
          <RequirePermission permission={AUDITORIA_PERMISSIONS.eventList}>
            <ScreenAccessPage />
          </RequirePermission>
        )}
      />
      <Route path="relatorios" element={<AuditReportsPage />} />
    </Routes>
  );
}
