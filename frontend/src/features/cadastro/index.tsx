import { Routes, Route } from 'react-router-dom';
import { AssociacoesPage } from './associacoes';
import { TitularesPage, TitularCreatePage, TitularEditPage } from './titulares';
import { ObrasPage, ObraCreatePage, ObraDetailPage } from './obras';
import { FonogramasPage, FonogramaCreatePage, FonogramaDetailPage } from './fonogramas';
import { OcorrenciasPage, OcorrenciaDetailPage } from './ocorrencias';
import { SolicitacoesPage } from './solicitacoes';

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
      <Route path="fonogramas" element={<FonogramasPage />} />
      <Route path="fonogramas/novo" element={<FonogramaCreatePage />} />
      <Route path="fonogramas/:id" element={<FonogramaDetailPage />} />
      <Route path="ocorrencias" element={<OcorrenciasPage />} />
      <Route path="ocorrencias/:id" element={<OcorrenciaDetailPage />} />
      <Route path="solicitacoes" element={<SolicitacoesPage />} />
    </Routes>
  );
}
