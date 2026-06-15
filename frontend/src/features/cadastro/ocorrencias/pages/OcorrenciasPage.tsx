import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Badge } from '@components/ui/badge';
import { Select } from '@components/ui/select';
import { TextInput } from '@components/ui/text-input';
import { Pagination } from '@components/ui/pagination';
import { useOcorrencias } from '../hooks/useOcorrencias';
import type { OcorrenciaFiltros, OcorrenciaStatus, OcorrenciaTipo } from '../types/ocorrencia';
import styles from './OcorrenciasPage.module.css';

const STATUS_LABEL: Record<OcorrenciaStatus, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em Análise',
  RESOLVIDA: 'Resolvida',
  CANCELADA: 'Cancelada',
};

const STATUS_VARIANT: Record<OcorrenciaStatus, 'warning' | 'accent' | 'success' | 'muted'> = {
  ABERTA: 'warning',
  EM_ANALISE: 'accent',
  RESOLVIDA: 'success',
  CANCELADA: 'muted',
};

const TIPO_LABEL: Record<OcorrenciaTipo, string> = {
  TITULARIDADE_DIVERGENTE: 'Titularidade Divergente',
  FONOGRAMA_INCORRETO: 'Fonograma Incorreto',
  DADO_CADASTRAL: 'Dado Cadastral',
  OBRA_AUSENTE: 'Obra Ausente',
};

const STATUS_OPTIONS: { value: OcorrenciaStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'ABERTA', label: 'Aberta' },
  { value: 'EM_ANALISE', label: 'Em Análise' },
  { value: 'RESOLVIDA', label: 'Resolvida' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const TIPO_OPTIONS: { value: OcorrenciaTipo | ''; label: string }[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'TITULARIDADE_DIVERGENTE', label: 'Titularidade Divergente' },
  { value: 'FONOGRAMA_INCORRETO', label: 'Fonograma Incorreto' },
  { value: 'DADO_CADASTRAL', label: 'Dado Cadastral' },
  { value: 'OBRA_AUSENTE', label: 'Obra Ausente' },
];

export function OcorrenciasPage() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<OcorrenciaFiltros>({ page: 1, size: 20, sort: 'abertaEm' });
  const { data, isLoading, error, refetch } = useOcorrencias(filtros);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Ocorrências"
        description="Triagem de ocorrências abertas por titulares. Analise, resolva ou cancele cada caso."
      />

      <div className={styles.filters}>
        <TextInput
          placeholder="Buscar por titular..."
          value={filtros.titularNome ?? ''}
          onChange={(val) => setFiltros((prev) => ({ ...prev, titularNome: val || undefined, page: 1 }))}
          aria-label="Filtrar por titular"
        />
        <Select<OcorrenciaStatus | ''>
          value={filtros.status ?? ''}
          onChange={(val) =>
            setFiltros((prev) => ({ ...prev, status: (val as OcorrenciaStatus) || undefined, page: 1 }))
          }
          options={STATUS_OPTIONS}
          placeholder="Todos os status"
          aria-label="Filtrar por status"
        />
        <Select<OcorrenciaTipo | ''>
          value={filtros.tipo ?? ''}
          onChange={(val) =>
            setFiltros((prev) => ({ ...prev, tipo: (val as OcorrenciaTipo) || undefined, page: 1 }))
          }
          options={TIPO_OPTIONS}
          placeholder="Todos os tipos"
          aria-label="Filtrar por tipo"
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message="Erro ao carregar ocorrências" onRetry={refetch} />
      ) : data && data.data.length === 0 ? (
        <div className={styles.empty}>
          <p>Nenhuma ocorrência encontrada.</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>TITULAR</th>
                  <th className={styles.th}>TIPO</th>
                  <th className={styles.th}>STATUS</th>
                  <th className={styles.th}>ABERTA EM</th>
                  <th className={`${styles.th} ${styles.textRight}`}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((oc) => (
                  <tr key={oc.id} className={`${styles.row} ${styles.clickableRow}`}>
                    <td className={styles.td}>
                      <span className={styles.nome}>{oc.titularNome}</span>
                    </td>
                    <td className={styles.td}>
                      <span>{TIPO_LABEL[oc.tipo]}</span>
                    </td>
                    <td className={styles.td}>
                      <Badge variant={STATUS_VARIANT[oc.status]}>{STATUS_LABEL[oc.status]}</Badge>
                    </td>
                    <td className={styles.td}>{new Date(oc.abertaEm).toLocaleDateString('pt-BR')}</td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => navigate(`/cadastro/ocorrencias/${oc.id}`)}
                          aria-label={`Ver ocorrência de ${oc.titularNome}`}
                          title="Ver detalhes"
                          type="button"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && (
            <Pagination
              pagination={data.pagination}
              onPageChange={(page) => setFiltros((prev) => ({ ...prev, page }))}
            />
          )}
        </>
      )}
    </div>
  );
}
