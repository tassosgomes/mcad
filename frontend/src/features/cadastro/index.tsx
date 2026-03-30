import { Routes, Route } from 'react-router-dom';
import { AssociacoesPage } from './associacoes';

export default function CadastroRoutes() {
  return (
    <Routes>
      <Route path="associacoes" element={<AssociacoesPage />} />
    </Routes>
  );
}
