import { Routes, Route } from 'react-router-dom';
import { AssociacoesPage } from './associacoes';
import { TitularesPage, TitularCreatePage, TitularEditPage } from './titulares';
import { ObrasPage, ObraCreatePage, ObraDetailPage } from './obras';

export default function CadastroRoutes() {
  return (
    <Routes>
      <Route path="associacoes" element={<AssociacoesPage />} />
      <Route path="titulares" element={<TitularesPage />} />
      <Route path="titulares/novo" element={<TitularCreatePage />} />
      <Route path="titulares/:id/editar" element={<TitularEditPage />} />
      <Route path="obras" element={<ObrasPage />} />
      <Route path="obras/nova" element={<ObraCreatePage />} />
      <Route path="obras/:id" element={<ObraDetailPage />} />
    </Routes>
  );
}
