import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { usePagamento } from '../hooks/usePagamento';
import { StatusBadgePagamento } from '../components/StatusBadgePagamento';
import { formatBRL, formatUdas } from '../../shared/utils/formatCurrency';
import styles from './PagamentoDetailPage.module.css';

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PagamentoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: pagamento, isLoading, error, refetch } = usePagamento(id!);

  if (isLoading) return <Loading />;
  if (error || !pagamento) {
    return <ErrorState message="Pagamento não encontrado" onRetry={refetch} />;
  }

  const idTruncado = pagamento.id.slice(0, 8).toUpperCase();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/arrecadacao/pagamentos')}
          type="button"
          id="btn-back-detalhe-pagamento"
        >
          <ArrowLeft size={16} /> Pagamentos
        </Button>
        <PageHeader
          title={`Pagamento #${idTruncado}`}
          description="Detalhes do registro de pagamento em UDAs."
        />
      </div>

      {/* Card principal */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Dados do Pagamento</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Status</span>
            <div><StatusBadgePagamento status={pagamento.status} /></div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Período</span>
            <span className={`${styles.fieldValue} ${styles.mono}`}>{pagamento.periodo}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Quantidade de UDAs</span>
            <span className={`${styles.fieldValue} ${styles.mono}`}>{formatUdas(pagamento.quantidadeUdas)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Valor da UDA (snapshot)</span>
            <span className={`${styles.fieldValue} ${styles.mono}`}>{formatBRL(pagamento.valorUdaNoMomento)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Valor Bruto</span>
            <span className={`${styles.fieldValue} ${styles.valorDestaque}`}>{formatBRL(pagamento.valorBruto)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Data de Registro</span>
            <span className={styles.fieldSub}>{formatDateTime(pagamento.dataRegistro)}</span>
          </div>
        </div>
      </div>

      {/* Card licença expandida */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Licença</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Usuário de Música</span>
            <span className={styles.fieldValue}>{pagamento.licenca.usuarioMusica.razaoSocial}</span>
            <span className={styles.fieldSub}>{pagamento.licenca.usuarioMusica.cnpj}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Rubrica</span>
            <span className={styles.fieldValue}>
              <span className={styles.chip}>{pagamento.licenca.rubrica.sigla}</span>
              {pagamento.licenca.rubrica.nome}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Status da Licença</span>
            <span className={styles.fieldSub}>{pagamento.licenca.status}</span>
          </div>
        </div>
      </div>

      {/* Ação Estornar — preparada para F06 */}
      <div className={styles.acoesCard}>
        <h2 className={styles.sectionTitle}>Ações</h2>
        <Button
          variant="secondary"
          type="button"
          disabled
          title="Disponível na próxima versão (F06)"
          id="btn-estornar-pagamento"
        >
          Estornar Pagamento
        </Button>
        <p className={styles.hintEstornar}>Estorno disponível na versão F06.</p>
      </div>
    </div>
  );
}
