import { Routes, Route } from 'react-router-dom';
import { CaptacoesPage, CaptacaoCreatePage, CaptacaoDetailPage } from './captacoes';
import { PendentesPage } from './pendentes';

export default function IdentificacaoRoutes() {
  return (
    <Routes>
      <Route path="captacoes" element={<CaptacoesPage />} />
      <Route path="captacoes/nova" element={<CaptacaoCreatePage />} />
      <Route path="captacoes/:id" element={<CaptacaoDetailPage />} />
      <Route path="pendentes" element={<PendentesPage />} />
    </Routes>
  );
}
