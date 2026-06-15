import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { TextInput } from '@components/ui/text-input';
import { Modal } from '@components/ui/modal';
import { useToast } from '@components/ui/toast';
import { Can } from '@shared/authz/Can';
import { useOcorrencia } from '../hooks/useOcorrencia';
import { useAssumirOcorrencia } from '../hooks/useAssumirOcorrencia';
import { useResolverOcorrencia } from '../hooks/useResolverOcorrencia';
import { useCancelarOcorrencia } from '../hooks/useCancelarOcorrencia';
import type { OcorrenciaStatus, OcorrenciaTipo } from '../types/ocorrencia';
import styles from './OcorrenciaDetailPage.module.css';

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

export function OcorrenciaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [resolverModal, setResolverModal] = useState(false);
  const [cancelarModal, setCancelarModal] = useState(false);
  const [parecer, setParecer] = useState('');
  const [justificativa, setJustificativa] = useState('');

  const { data: ocorrencia, isLoading, error, refetch } = useOcorrencia(id!);
  const assumirMutation = useAssumirOcorrencia();
  const resolverMutation = useResolverOcorrencia();
  const cancelarMutation = useCancelarOcorrencia();

  const handleAssumir = async () => {
    try {
      await assumirMutation.mutateAsync(id!);
      showToast('Ocorrência assumida para análise', 'success');
      refetch();
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao assumir ocorrência', 'error');
    }
  };

  const handleResolver = async () => {
    if (!parecer.trim()) return;
    try {
      await resolverMutation.mutateAsync({ id: id!, resolucao: parecer.trim() });
      showToast('Ocorrência resolvida', 'success');
      setResolverModal(false);
      setParecer('');
      refetch();
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao resolver ocorrência', 'error');
    }
  };

  const handleCancelar = async () => {
    if (!justificativa.trim()) return;
    try {
      await cancelarMutation.mutateAsync({ id: id!, justificativa: justificativa.trim() });
      showToast('Ocorrência cancelada', 'success');
      setCancelarModal(false);
      setJustificativa('');
      refetch();
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao cancelar ocorrência', 'error');
    }
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrorState message="Erro ao carregar ocorrência" onRetry={refetch} />;
  if (!ocorrencia) return <ErrorState message="Ocorrência não encontrada" />;

  const estaFinalizada = ocorrencia.status === 'RESOLVIDA' || ocorrencia.status === 'CANCELADA';

  return (
    <div className={styles.page}>
      <Link to="/cadastro/ocorrencias" className={styles.backLink}>
        <ArrowLeft size={14} /> Voltar para Ocorrências
      </Link>

      <PageHeader
        title="Detalhe da Ocorrência"
        description={`Aberta por ${ocorrencia.titularNome}`}
      />

      <div className={styles.detailCard}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Status</span>
          <span className={styles.fieldValue}>
            <Badge variant={STATUS_VARIANT[ocorrencia.status]}>{STATUS_LABEL[ocorrencia.status]}</Badge>
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Tipo</span>
          <span className={styles.fieldValue}>{TIPO_LABEL[ocorrencia.tipo]}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Titular</span>
          <span className={styles.fieldValue}>{ocorrencia.titularNome}</span>
        </div>

        {ocorrencia.obraId && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Obra</span>
            <span className={styles.fieldValue}>{ocorrencia.obraId}</span>
          </div>
        )}

        {ocorrencia.fonogramaId && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Fonograma</span>
            <span className={styles.fieldValue}>{ocorrencia.fonogramaId}</span>
          </div>
        )}

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Descrição</span>
          <span className={styles.fieldValue}>{ocorrencia.descricao}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Aberta em</span>
          <span className={styles.fieldValue}>{new Date(ocorrencia.abertaEm).toLocaleString('pt-BR')}</span>
        </div>

        {ocorrencia.resolucao && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Resolução</span>
            <span className={styles.fieldValue}>{ocorrencia.resolucao}</span>
          </div>
        )}

        {ocorrencia.justificativaCancelamento && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Justificativa de Cancelamento</span>
            <span className={styles.fieldValue}>{ocorrencia.justificativaCancelamento}</span>
          </div>
        )}

        {ocorrencia.resolvidaEm && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Resolvida em</span>
            <span className={styles.fieldValue}>{new Date(ocorrencia.resolvidaEm).toLocaleString('pt-BR')}</span>
          </div>
        )}

        {!estaFinalizada && (
          <div className={styles.actions}>
            {ocorrencia.status === 'ABERTA' && (
              <Can permission="cadastro:default:ocorrencia:analisar">
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleAssumir}
                  disabled={assumirMutation.isPending}
                >
                  Assumir Análise
                </Button>
              </Can>
            )}
            {ocorrencia.status === 'EM_ANALISE' && (
              <>
                <Can permission="cadastro:default:ocorrencia:resolver">
                  <Button
                    variant="primary"
                    type="button"
                    onClick={() => setResolverModal(true)}
                  >
                    Resolver
                  </Button>
                </Can>
                <Can permission="cadastro:default:ocorrencia:cancelar">
                  <Button
                    variant="danger"
                    type="button"
                    onClick={() => setCancelarModal(true)}
                  >
                    Cancelar
                  </Button>
                </Can>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de Resolução */}
      <Modal
        isOpen={resolverModal}
        onClose={() => { setResolverModal(false); setParecer(''); }}
        title="Resolver Ocorrência"
        actions={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => { setResolverModal(false); setParecer(''); }}
              disabled={resolverMutation.isPending}
            >
              Voltar
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleResolver}
              disabled={!parecer.trim() || resolverMutation.isPending}
            >
              Confirmar Resolução
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          <p>Registre o parecer da resolução desta ocorrência:</p>
          <TextInput
            value={parecer}
            onChange={setParecer}
            placeholder="Descreva a resolução..."
            aria-label="Parecer de resolução"
          />
        </div>
      </Modal>

      {/* Modal de Cancelamento */}
      <Modal
        isOpen={cancelarModal}
        onClose={() => { setCancelarModal(false); setJustificativa(''); }}
        title="Cancelar Ocorrência"
        actions={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => { setCancelarModal(false); setJustificativa(''); }}
              disabled={cancelarMutation.isPending}
            >
              Voltar
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleCancelar}
              disabled={!justificativa.trim() || cancelarMutation.isPending}
            >
              Confirmar Cancelamento
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          <p>Informe a justificativa para o cancelamento:</p>
          <TextInput
            value={justificativa}
            onChange={setJustificativa}
            placeholder="Justificativa do cancelamento..."
            aria-label="Justificativa de cancelamento"
          />
        </div>
      </Modal>
    </div>
  );
}
