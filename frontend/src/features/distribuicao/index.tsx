import { Route, Routes } from 'react-router-dom';
import { ProcessoCalculoPage } from './processos';
import { RubricasPage } from './rubricas/pages/RubricasPage';

export default function DistribuicaoRoutes() {
  return (
    <Routes>
      <Route path="rubricas" element={<RubricasPage />} />
      <Route path="processos/:id" element={<ProcessoCalculoPage />} />
    </Routes>
  );
}
