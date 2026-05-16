import { Route, Routes } from 'react-router-dom';
import { ProcessoCalculoPage } from './processos';
import { ProcessosPage } from './processos/pages/ProcessosPage';
import { ProcessoDetailPage } from './processos/pages/ProcessoDetailPage';
import { CriarProcessoPage } from './processos/pages/CriarProcessoPage';
import { RubricasPage } from './rubricas/pages/RubricasPage';

export default function DistribuicaoRoutes() {
  return (
    <Routes>
      <Route path="rubricas" element={<RubricasPage />} />
      <Route path="processos" element={<ProcessosPage />} />
      <Route path="processos/novo" element={<CriarProcessoPage />} />
      <Route path="processos/:id" element={<ProcessoDetailPage />} />
      <Route path="processos/:id/calculo" element={<ProcessoCalculoPage />} />
    </Routes>
  );
}
