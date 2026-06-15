import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@components/ui/page-header';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { useSolicitacoes } from '../../solicitacoes/hooks/useSolicitacoes';
import type { SolicitacaoStatus, SolicitacaoAlteracao } from '../../solicitacoes/types/solicitacao';
import type { BadgeVariant } from '@components/ui/badge/Badge';
import styles from './SolicitacoesPage.module.css';

const STATUS_VARIANT: Record<SolicitacaoStatus, BadgeVariant> = {
  SOLICITADA: 'warning',
  APROVADA: 'success',
  REJEITADA: 'error',
};

const STATUS_LABEL: Record<SolicitacaoStatus, string> = {
  SOLICITADA: 'Solicitada',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
};

const CAMPO_LABEL: Record<string, string> = {
  NOME: 'Nome',
  CAE_IPI: 'CAE/IPI',
  ASSOCIACAO: 'Associação',
  CATEGORIA: 'Categoria',
};

export function SolicitacoesPage() {
  const { data, isLoading, error } = useSolicitacoes();
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Minhas Solicitações"
        description="Acompanhe o status das suas solicitações de alteração de dados sensíveis."
        action={
          <Button variant="primary" size="sm" onClick={() => navigate('/portal/solicitacoes/abrir')}>
            Nova Solicitação
          </Button>
        }
      />
      <div className={styles.content}>
        {isLoading && <Loading />}
        {error && (
          <div className={styles.errorState}>Erro ao carregar solicitações.</div>
        )}
        {data && data.length === 0 && (
          <div className={styles.emptyState}>Nenhuma solicitação encontrada.</div>
        )}
        {data && data.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>CAMPO</th>
                  <th className={styles.th}>VALOR PRETENDIDO</th>
                  <th className={styles.th}>JUSTIFICATIVA</th>
                  <th className={styles.th}>STATUS</th>
                  <th className={styles.th}>REJEIÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {data.map((sol: SolicitacaoAlteracao) => (
                  <tr key={sol.id} className={styles.row}>
                    <td className={styles.td}>{CAMPO_LABEL[sol.campo] ?? sol.campo}</td>
                    <td className={styles.td}>{sol.valorPretendido}</td>
                    <td className={styles.td}>{sol.justificativa}</td>
                    <td className={styles.td}>
                      <Badge variant={STATUS_VARIANT[sol.status]}>
                        {STATUS_LABEL[sol.status]}
                      </Badge>
                    </td>
                    <td className={styles.td}>{sol.justificativaRejeicao ?? '—'}</td>
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
