import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@components/ui/page-header';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { Select } from '@components/ui/select';
import { useOcorrencias } from '../../ocorrencias/hooks/useOcorrencias';
import type { OcorrenciaStatus, Ocorrencia } from '../../ocorrencias/types/ocorrencia';
import type { BadgeVariant } from '@components/ui/badge/Badge';
import styles from './OcorrenciasPage.module.css';

const STATUS_VARIANT: Record<OcorrenciaStatus, BadgeVariant> = {
  ABERTA: 'secondary',
  EM_ANALISE: 'warning',
  RESOLVIDA: 'success',
  CANCELADA: 'muted',
};

const STATUS_LABEL: Record<OcorrenciaStatus, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em Análise',
  RESOLVIDA: 'Resolvida',
  CANCELADA: 'Cancelada',
};

const STATUS_FILTER_OPTIONS = [
  { value: '' as const, label: 'Todos os status' },
  { value: 'ABERTA' as const, label: 'Aberta' },
  { value: 'EM_ANALISE' as const, label: 'Em Análise' },
  { value: 'RESOLVIDA' as const, label: 'Resolvida' },
  { value: 'CANCELADA' as const, label: 'Cancelada' },
];

const TIPO_LABEL: Record<string, string> = {
  TITULARIDADE_DIVERGENTE: 'Titularidade divergente',
  FONOGRAMA_INCORRETO: 'Fonograma incorreto',
  DADO_CADASTRAL: 'Dado cadastral errado',
  OBRA_AUSENTE: 'Obra ausente',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function OcorrenciasPage() {
  const [statusFilter, setStatusFilter] = useState<OcorrenciaStatus | ''>('');
  const { data, isLoading, error } = useOcorrencias(
    statusFilter ? { status: statusFilter } : {},
  );
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Minhas Ocorrências"
        description="Acompanhe o status das ocorrências que você abriu."
        action={
          <Button variant="primary" size="sm" onClick={() => navigate('/portal/ocorrencias/abrir')}>
            Nova Ocorrência
          </Button>
        }
      />
      <div className={styles.filters}>
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as OcorrenciaStatus | '')}
          options={STATUS_FILTER_OPTIONS}
          aria-label="Filtrar por status"
        />
      </div>
      <div className={styles.content}>
        {isLoading && <Loading />}
        {error && (
          <div className={styles.errorState}>Erro ao carregar ocorrências.</div>
        )}
        {data && data.length === 0 && (
          <div className={styles.emptyState}>Nenhuma ocorrência encontrada.</div>
        )}
        {data && data.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>TIPO</th>
                  <th className={styles.th}>DESCRIÇÃO</th>
                  <th className={styles.th}>STATUS</th>
                  <th className={styles.th}>ABERTA EM</th>
                  <th className={styles.th}>RESOLUÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {data.map((oc: Ocorrencia) => (
                  <tr key={oc.id} className={styles.row}>
                    <td className={styles.td}>{TIPO_LABEL[oc.tipo] ?? oc.tipo}</td>
                    <td className={styles.td}>{oc.descricao}</td>
                    <td className={styles.td}>
                      <Badge variant={STATUS_VARIANT[oc.status]}>
                        {STATUS_LABEL[oc.status]}
                      </Badge>
                    </td>
                    <td className={[styles.td, styles.mono].join(' ')}>{formatDate(oc.abertaEm)}</td>
                    <td className={styles.td}>{oc.resolucao ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
