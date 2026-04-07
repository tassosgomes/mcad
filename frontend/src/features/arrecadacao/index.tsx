import { Routes, Route } from 'react-router-dom';
import { LicencasPage } from './licencas/pages/LicencasPage';
import { LicencaCreatePage } from './licencas/pages/LicencaCreatePage';
import { LicencaDetailPage } from './licencas/pages/LicencaDetailPage';
import { UdaPage } from './uda/pages/UdaPage';
import { PagamentosPage } from './pagamentos/pages/PagamentosPage';
import { PagamentoCreatePage } from './pagamentos/pages/PagamentoCreatePage';
import { PagamentoDetailPage } from './pagamentos/pages/PagamentoDetailPage';

export default function ArrecadacaoRoutes() {
  return (
    <Routes>
      <Route path="licencas" element={<LicencasPage />} />
      <Route path="licencas/nova" element={<LicencaCreatePage />} />
      <Route path="licencas/:id" element={<LicencaDetailPage />} />
      <Route path="uda" element={<UdaPage />} />
      <Route path="pagamentos" element={<PagamentosPage />} />
      <Route path="pagamentos/novo" element={<PagamentoCreatePage />} />
      <Route path="pagamentos/:id" element={<PagamentoDetailPage />} />
    </Routes>
  );
}
