import { Routes, Route } from 'react-router-dom';
import { LicencasPage } from './licencas/pages/LicencasPage';
import { LicencaCreatePage } from './licencas/pages/LicencaCreatePage';
import { LicencaDetailPage } from './licencas/pages/LicencaDetailPage';
import { UsuariosMusicaPage } from './usuarios-musica/pages/UsuariosMusicaPage';
import { UsuarioMusicaCreatePage } from './usuarios-musica/pages/UsuarioMusicaCreatePage';
import { UsuarioMusicaDetailPage } from './usuarios-musica/pages/UsuarioMusicaDetailPage';
import { UsuarioMusicaEditPage } from './usuarios-musica/pages/UsuarioMusicaEditPage';
import { UdaPage } from './uda/pages/UdaPage';
import { PagamentosPage } from './pagamentos/pages/PagamentosPage';
import { PagamentoCreatePage } from './pagamentos/pages/PagamentoCreatePage';
import { PagamentoDetailPage } from './pagamentos/pages/PagamentoDetailPage';
import { VerbasPage } from './verbas/pages/VerbasPage';

export default function ArrecadacaoRoutes() {
  return (
    <Routes>
      <Route path="usuarios-musica" element={<UsuariosMusicaPage />} />
      <Route path="usuarios-musica/novo" element={<UsuarioMusicaCreatePage />} />
      <Route path="usuarios-musica/:id" element={<UsuarioMusicaDetailPage />} />
      <Route path="usuarios-musica/:id/editar" element={<UsuarioMusicaEditPage />} />
      <Route path="licencas" element={<LicencasPage />} />
      <Route path="licencas/nova" element={<LicencaCreatePage />} />
      <Route path="licencas/:id" element={<LicencaDetailPage />} />
      <Route path="uda" element={<UdaPage />} />
      <Route path="pagamentos" element={<PagamentosPage />} />
      <Route path="pagamentos/novo" element={<PagamentoCreatePage />} />
      <Route path="pagamentos/:id" element={<PagamentoDetailPage />} />
      <Route path="verbas" element={<VerbasPage />} />
    </Routes>
  );
}
