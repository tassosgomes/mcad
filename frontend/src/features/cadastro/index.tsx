import { Routes, Route } from 'react-router-dom';
import { AssociacoesPage } from './associacoes';
import { TitularesPage, TitularCreatePage, TitularEditPage } from './titulares';

export default function CadastroRoutes() {
  return (
    <Routes>
      <Route path="associacoes" element={<AssociacoesPage />} />
      <Route path="titulares" element={<TitularesPage />} />
      <Route path="titulares/novo" element={<TitularCreatePage />} />
      <Route path="titulares/:id/editar" element={<TitularEditPage />} />
    </Routes>
  );
}
