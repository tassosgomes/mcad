import { Navigate, Route, Routes } from 'react-router-dom';
import { PermissionsPage } from './pages/PermissionsPage';

export default function AuthzRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="permissoes" replace />} />
      <Route path="permissoes" element={<PermissionsPage />} />
    </Routes>
  );
}
