import { Navigate, Route, Routes } from 'react-router-dom';
import { PermissionsPage } from './pages/PermissionsPage';
import { RolesPage } from './pages/RolesPage';

export default function AuthzRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="permissoes" replace />} />
      <Route path="permissoes" element={<PermissionsPage />} />
      <Route path="papeis" element={<RolesPage />} />
    </Routes>
  );
}
