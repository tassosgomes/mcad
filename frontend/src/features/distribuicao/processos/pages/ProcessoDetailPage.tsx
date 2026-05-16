import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { useToast } from '@components/ui/toast';
import { useProcesso } from '../hooks/useProcesso';
import {
  useCalcularProcesso,
  useAprovarProcesso,
  useFinalizarProcesso,
  useCancelarProcesso,
} from '../hooks/useProcessoMutations';
import { ProcessoStatusBadge } from '../components/ProcessoStatusBadge';
import { ProcessoActions } from '../components/ProcessoActions';
import { CancelarModal } from '../components/CancelarModal';
import { FinalizarModal } from '../components/FinalizarModal';
import styles from './ProcessoDetailPage.module.css';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProcessoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [finalizarOpen, setFinalizarOpen] = useState(false);

  const { data: processo, isLoading, error, refetch } = useProcesso(id!);

  const calcular = useCalcularProcesso();
  const aprovar = useAprovarProcesso();
  const finalizar = useFinalizarProcesso();
  const cancelar = useCancelarProcesso();

  const isAnyLoading =
    calcular.isPending || aprovar.isPending || finalizar.isPending || cancelar.isPending;

  async function handleCalcular() {
    try {
      await calcular.mutateAsync(id!);
      addToast({ type: 'success', title: 'Sucesso', message: 'Cálculo iniciado com sucesso!' });
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      addToast({ type: 'error', title: 'Erro', message: problem.detail || 'Erro ao calcular processo' });
    }
  }

  async function handleAprovar() {
    try {
      await aprovar.mutateAsync(id!);
      addToast({ type: 'success', title: 'Sucesso', message: 'Processo aprovado com sucesso!' });
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      addToast({ type: 'error', title: 'Erro', message: problem.detail || 'Erro ao aprovar processo' });
    }
  }

  async function handleFinalizar() {
    try {
      await finalizar.mutateAsync(id!);
      setFinalizarOpen(false);
      addToast({ type: 'success', title: 'Sucesso', message: 'Processo finalizado com sucesso!' });
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      addToast({ type: 'error', title: 'Erro', message: problem.detail || 'Erro ao finalizar processo' });
      throw err;
    }
  }

  async function handleCancelar(justificativa: string) {
    await cancelar.mutateAsync({ id: id!, data: { justificativa } });
    setCancelarOpen(false);
    addToast({ type: 'success', title: 'Sucesso', message: 'Processo cancelado com sucesso!' });
  }

  if (isLoading) return <Loading />;
  if (error || !processo) {
    return <ErrorState message="Processo não encontrado" onRetry={refetch} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.topNav}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/distribuicao/processos')}
          type="button"
          id="btn-back-detalhe-processo"
        >
          <ArrowLeft size={16} /> Processos
        </Button>
      </div>

      <PageHeader
        title={`${processo.rubrica.sigla} — ${processo.periodo}`}
        description={processo.rubrica.nome}
        action={<ProcessoStatusBadge status={processo.status} />}
      />

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Dados do Processo</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Rubrica</span>
            <span className={styles.fieldValue}>
              <span className={styles.chip}>{processo.rubrica.sigla}</span>
              {processo.rubrica.nome}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Período</span>
            <span className={`${styles.fieldValue} ${styles.mono}`}>{processo.periodo}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Verba Líquida</span>
            <span className={`${styles.fieldValue} ${styles.valorDestaque}`}>
              {formatBRL(processo.verbaLiquida)}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Total de Execuções</span>
            <span className={`${styles.fieldValue} ${styles.mono}`}>
              {processo.totalExecucoes !== null
                ? processo.totalExecucoes.toLocaleString('pt-BR')
                : '—'}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Analista Responsável</span>
            <span className={styles.fieldValue}>{processo.analistaResponsavel}</span>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Histórico de Transições</h2>
        <div className={styles.timeline}>
          <div className={styles.timelineItem}>
            <span className={styles.timelineLabel}>Criado em</span>
            <span className={styles.timelineValue}>{formatDateTime(processo.criadoEm)}</span>
          </div>
          {processo.calculadoEm && (
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Calculado em</span>
              <span className={styles.timelineValue}>{formatDateTime(processo.calculadoEm)}</span>
            </div>
          )}
          {processo.aprovadoEm && (
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Aprovado em</span>
              <span className={styles.timelineValue}>{formatDateTime(processo.aprovadoEm)}</span>
            </div>
          )}
          {processo.finalizadoEm && (
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Finalizado em</span>
              <span className={styles.timelineValue}>{formatDateTime(processo.finalizadoEm)}</span>
            </div>
          )}
          {processo.canceladoEm && (
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Cancelado em</span>
              <span className={styles.timelineValue}>{formatDateTime(processo.canceladoEm)}</span>
            </div>
          )}
        </div>
      </div>

      {processo.status === 'CANCELADO' && processo.justificativaCancelamento && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Dados do Cancelamento</h2>
          <div className={styles.grid}>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.fieldLabel}>Justificativa</span>
              <span className={styles.fieldValue}>{processo.justificativaCancelamento}</span>
            </div>
          </div>
        </div>
      )}

      {processo.status !== 'FINALIZADO' && processo.status !== 'CANCELADO' && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Ações</h2>
          <ProcessoActions
            processo={processo}
            onCalcular={handleCalcular}
            onAprovar={handleAprovar}
            onFinalizar={() => setFinalizarOpen(true)}
            onCancelar={() => setCancelarOpen(true)}
            isLoading={isAnyLoading}
          />
        </div>
      )}

      <CancelarModal
        isOpen={cancelarOpen}
        onClose={() => setCancelarOpen(false)}
        onConfirm={handleCancelar}
        isLoading={cancelar.isPending}
      />

      <FinalizarModal
        isOpen={finalizarOpen}
        onClose={() => setFinalizarOpen(false)}
        onConfirm={handleFinalizar}
        isLoading={finalizar.isPending}
      />
    </div>
  );
}
