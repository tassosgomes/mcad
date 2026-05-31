import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCcw } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { usePermissions } from '@shared/authz';
import { ActorDisplay } from '../../shared/components/actor-display';
import { usePagamento } from '../hooks/usePagamento';
import { StatusBadgePagamento } from '../components/StatusBadgePagamento';
import { EstornarPagamentoModal } from '../components/EstornarPagamentoModal';
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
  const { can } = usePermissions();
  const [showModal, setShowModal] = useState(false);
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

      {/* Card dados do estorno */}
      {pagamento.status === 'ESTORNADO' && pagamento.justificativaEstorno && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Dados do Estorno</h2>
          <div className={styles.grid}>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.fieldLabel}>Justificativa</span>
              <span className={styles.fieldValue}>{pagamento.justificativaEstorno}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Estornado por</span>
              <span className={styles.fieldValue}>
                <ActorDisplay
                  actor={pagamento.estornadoPorAtor}
                  fallbackLabel={pagamento.estornadoPor}
                  size="md"
                />
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Data do estorno</span>
              <span className={styles.fieldSub}>
                {pagamento.estornadoEm ? formatDateTime(pagamento.estornadoEm) : '-'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Ação Estornar */}
      {pagamento.status === 'CONFIRMADO' && can('arrecadacao:default:pagamento:estornar') && (
        <div className={styles.acoesCard}>
          <h2 className={styles.sectionTitle}>Ações</h2>
          <Button
            variant="danger"
            type="button"
            onClick={() => setShowModal(true)}
            id="btn-estornar-pagamento"
          >
            <RefreshCcw size={16} /> Estornar Pagamento
          </Button>
        </div>
      )}

      <EstornarPagamentoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        pagamento={pagamento}
      />
    </div>
  );
}
