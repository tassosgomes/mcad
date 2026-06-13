import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pause, Play, XCircle } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { useToast } from '@components/ui/toast';
import { usePermissions } from '@shared/authz';
import { useLicenca } from '../hooks/useLicenca';
import { useHistoricoStatusLicenca } from '../hooks/useHistoricoStatusLicenca';
import { StatusBadgeLicenca } from '../components/StatusBadgeLicenca';
import { AlterarStatusModal, type AcaoStatus } from '../components/AlterarStatusModal';
import { HistoricoStatusTimeline } from '../components/HistoricoStatusTimeline';
import styles from './LicencaDetailPage.module.css';
import { formatCnpj } from '../../usuarios-musica/utils/formatters';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Indefinida';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

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

export function LicencaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const isAnalista = can('arrecadacao:default:contrato:editar');

  const { data: licenca, isLoading, error, refetch } = useLicenca(id!);
  const { data: historico = [] } = useHistoricoStatusLicenca(id!);

  const [modalAcao, setModalAcao] = useState<AcaoStatus | null>(null);

  if (isLoading) return <Loading />;
  if (error || !licenca) {
    return <ErrorState message="Licença não encontrada" onRetry={refetch} />;
  }

  const idTruncado = licenca.id.slice(0, 8).toUpperCase();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/arrecadacao/licencas')}
          type="button"
          id="btn-back-detalhe-licenca"
        >
          <ArrowLeft size={16} /> Licenças
        </Button>
        <PageHeader
          title={`Licença #${idTruncado}`}
          description="Detalhes e histórico da licença de execução pública."
        />
      </div>

      {/* Card de dados */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Dados da Licença</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Usuário de Música</span>
            <span className={styles.fieldValue}>{licenca.usuarioMusica.razaoSocial}</span>
            <span className={styles.fieldSub}>{formatCnpj(licenca.usuarioMusica.cnpj)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Rubrica</span>
            <span className={styles.fieldValue}>
              <span className={styles.chip}>{licenca.rubrica.sigla}</span>
              {licenca.rubrica.nome}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Vigência</span>
            <span className={styles.fieldValue}>
              {formatDate(licenca.dataInicio)} → {formatDate(licenca.dataFim)}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Status</span>
            <div><StatusBadgeLicenca status={licenca.status} /></div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Criado em</span>
            <span className={styles.fieldSub}>{formatDateTime(licenca.criadoEm)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Atualizado em</span>
            <span className={styles.fieldSub}>{formatDateTime(licenca.atualizadoEm)}</span>
          </div>
        </div>
      </div>

      {/* Ações (apenas analista) */}
      {isAnalista && licenca.status !== 'ENCERRADA' && (
        <div className={styles.acoesCard}>
          <h2 className={styles.sectionTitle}>Ações</h2>
          <div className={styles.acoes}>
            {licenca.status === 'ATIVA' && (
              <Button
                variant="secondary"
                onClick={() => setModalAcao('suspender')}
                type="button"
                id="btn-suspender-licenca"
              >
                <Pause size={16} /> Suspender
              </Button>
            )}
            {licenca.status === 'SUSPENSA' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => setModalAcao('reativar')}
                  type="button"
                  id="btn-reativar-licenca"
                >
                  <Play size={16} /> Reativar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setModalAcao('encerrar')}
                  type="button"
                  id="btn-encerrar-licenca"
                >
                  <XCircle size={16} /> Encerrar
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Histórico de Status</h2>
        <HistoricoStatusTimeline historico={historico} />
      </div>

      {/* Modal de transição */}
      {modalAcao && (
        <AlterarStatusModal
          acao={modalAcao}
          licencaId={licenca.id}
          isOpen={!!modalAcao}
          onClose={() => setModalAcao(null)}
          onSuccess={() => {
            setModalAcao(null);
            showToast(
              modalAcao === 'suspender'
                ? 'Licença suspensa com sucesso'
                : modalAcao === 'reativar'
                ? 'Licença reativada com sucesso'
                : 'Licença encerrada com sucesso',
              'success'
            );
            refetch();
          }}
        />
      )}
    </div>
  );
}
