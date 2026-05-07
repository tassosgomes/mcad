import { Route, Routes } from 'react-router-dom';
import { RubricasPage } from './rubricas/pages/RubricasPage';

export default function DistribuicaoRoutes() {
  return (
    <Routes>
      <Route path="rubricas" element={<RubricasPage />} />
    </Routes>
  );
}
