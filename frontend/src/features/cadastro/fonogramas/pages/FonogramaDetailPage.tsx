import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { useToast } from '@components/ui/toast';
import { Badge } from '@components/ui/badge';

import { useFonograma } from '../hooks/useFonograma';
import { useUpdateFonograma } from '../hooks/useUpdateFonograma';
import { useDeleteFonograma } from '../hooks/useDeleteFonograma';
import { useLiberarFonograma } from '../hooks/useLiberarFonograma';
import { useBloquearFonograma } from '../hooks/useBloquearFonograma';
import { useDesbloquearFonograma } from '../hooks/useDesbloquearFonograma';
import { useHistoricoFonograma } from '../hooks/useHistoricoFonograma';

import { LiberarButton, BloquearButton, DesbloquearButton } from '@shared/components/ui/status-actions';
import { BloqueioBanner } from '@shared/components/ui/bloqueio-banner';
import { BloqueioModal } from '@shared/components/ui/bloqueio-modal';
import { ChecklistPreRequisitos } from '@shared/components/ui/checklist-prereqs';
import { HistoricoBloqueios } from '@shared/components/ui/historico-bloqueios';
import { PreRequisitoItem } from '@features/cadastro/obras/types/obra';

import { FonogramaForm } from '../components/FonogramaForm';
import { FonogramaDepuracaoBanner } from '../components/FonogramaDepuracaoBanner';
import { FonogramaDepuracaoModal } from '../components/FonogramaDepuracaoModal';
import { DeleteFonogramaModal } from '../components/DeleteFonogramaModal';
import { formatIsrc } from '../utils/isrcFormatter';
import { Button } from '@components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { usePermissions } from '@shared/authz/usePermissions';

import styles from './FonogramaDetailPage.module.css';
import { ParticipacoesSection } from '@features/cadastro/participacoes';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary' | 'error'> = {
  Pendente_Validacao: 'warning',
  Pendente_Documentacao: 'warning',
  Liberado: 'success',
  Depurado: 'secondary',
};

export function FonogramaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canEdit = can('cadastro:default:fonograma:editar');
  const canDelete = can('cadastro:default:fonograma:excluir');
  const canLiberar = can('cadastro:default:status:liberar-fonograma');
  const canBloquear = can('cadastro:default:status:bloquear-fonograma');
  const canDesbloquear = can('cadastro:default:status:desbloquear-fonograma');
  // Aggregate write capability propagated to sub-sections (FonogramaForm,
  // ParticipacoesSection). Each enforces its own granular gates downstream.
  const canWrite = canEdit;

  const { data: fonograma, isLoading, error, refetch } = useFonograma(id);
  const updateMutation = useUpdateFonograma();
  const deleteMutation = useDeleteFonograma();
  
  const liberarMutation = useLiberarFonograma();
  const bloquearMutation = useBloquearFonograma();
  const desbloquearMutation = useDesbloquearFonograma();
  const { data: historico } = useHistoricoFonograma(id!);

  const [depuracaoData, setDepuracaoData] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDepuracaoModal, setShowDepuracaoModal] = useState(false);
  const [showBloqueioModal, setShowBloqueioModal] = useState(false);
  const [pendenciasValidacao, setPendenciasValidacao] = useState<PreRequisitoItem[]>([]);

  if (isLoading) return <Loading />;
  if (error || !fonograma) return <ErrorState message="Erro ao carregar fonograma" onRetry={refetch} />;

  const isLiberadoOuDepurado = fonograma.status === 'Liberado' || fonograma.status.toUpperCase() === 'LIBERADO' || fonograma.status === 'Depurado' || fonograma.status.toUpperCase() === 'DEPURADO';
  const isDepurado = fonograma.status === 'Depurado' || fonograma.status.toUpperCase() === 'DEPURADO';
  const isBloqueado = fonograma.status === 'Bloqueado' || fonograma.status.toUpperCase() === 'BLOQUEADO';

  const handleUpdate = async (formData: any) => {
    try {
      if (!id) return;
      await updateMutation.mutateAsync({ id, data: formData });
      showToast('Fonograma atualizado com sucesso.', 'success');
    } catch (err: unknown) {
      const problem = err as { code?: string, detail?: string };
      if (problem.code === 'DEPURACAO_NECESSARIA' || problem.detail?.includes('Obras associadas à este Fonograma estão liberadas/bloqueadas')) {
        // Fluxo de depuração em caso 409
        // A API real devolve 409 quando o ISRC muda no status Liberado, e precisamos invocar `/depurar`.
        setDepuracaoData({
          novoIsrc: formData.isrc,
          paisOrigem: formData.paisOrigem,
          dataGravacao: formData.dataGravacao,
          dataLancamento: formData.dataLancamento,
        });
      } else {
        showToast(problem.detail || 'Erro ao atualizar fonograma.', 'error');
      }
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      showToast('Fonograma excluído com sucesso.', 'success');
      navigate('/cadastro/fonogramas');
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao excluir fonograma.', 'error');
    }
  };

  const handleLiberar = async () => {
    if (!id) return;
    try {
      setPendenciasValidacao([]);
      await liberarMutation.mutateAsync(id);
    } catch (err: any) {
      if (err.status === 422 && err.pendencias) {
        setPendenciasValidacao(err.pendencias);
        showToast('Pré-requisitos não atendidos. Verifique a lista.', 'error');
      } else {
        showToast(err.detail || 'Erro ao liberar fonograma.', 'error');
      }
    }
  };

  const statusActions = (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {(!isLiberadoOuDepurado && !isBloqueado) && canLiberar && (
        <LiberarButton onClick={handleLiberar} isLoading={liberarMutation.isPending} />
      )}
      {(isLiberadoOuDepurado || !isBloqueado) && !isDepurado && canBloquear && (
        <BloquearButton onClick={() => setShowBloqueioModal(true)} />
      )}
      {isBloqueado && canDesbloquear && (
        <DesbloquearButton onClick={() => desbloquearMutation.mutate(id!)} isLoading={desbloquearMutation.isPending} />
      )}
    </div>
  );

  return (
    <div className={styles.page}>
      <div style={{ marginBottom: '-1rem' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/cadastro/fonogramas')}
          type="button"
        >
          <ArrowLeft size={16} /> Voltar
        </Button>
      </div>
      <PageHeader
        title={`Fonograma #${fonograma.codigo}`}
        description={`ISRC: ${formatIsrc(fonograma.isrcFormatado)}`}
        action={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Badge variant={STATUS_VARIANT[fonograma.status] as any}>
              {fonograma.status.replace('_', ' ')}
            </Badge>
            {(canLiberar || canBloquear || canDesbloquear) ? statusActions : null}
          </div>
        }
      />

      <div className={styles.content}>
        {isBloqueado && fonograma.bloqueioJustificativa && (
          <BloqueioBanner justificativa={fonograma.bloqueioJustificativa} />
        )}
        
        {pendenciasValidacao.length > 0 && (
          <ChecklistPreRequisitos pendencias={pendenciasValidacao} />
        )}
        
        {isDepurado && (
          <FonogramaDepuracaoBanner
            fonogramaDepuradoParaId={fonograma.fonogramaDepuradoParaId}
          />
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dados do Fonograma</h2>
          <FonogramaForm
            initialData={fonograma}
            onSubmit={handleUpdate}
            isLoading={updateMutation.isPending}
          />
          
          {canDelete && !isLiberadoOuDepurado && (
            <div className={styles.deleteZone}>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => setShowDeleteModal(true)}
              >
                Excluir Fonograma
              </button>
              <span className={styles.deleteWarning}>Atenção: Ações irreversíveis.</span>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Direitos Conexos</h2>
          <ParticipacoesSection
            fonogramaId={fonograma.id}
            fonogramaStatus={fonograma.status.toUpperCase()}
            canWrite={canWrite}
            onDepuracaoRequired={() => setShowDepuracaoModal(true)}
          />
        </section>

        <HistoricoBloqueios items={historico ?? []} />
      </div>

      <FonogramaDepuracaoModal
        isOpen={!!depuracaoData || showDepuracaoModal}
        onClose={() => { setDepuracaoData(null); setShowDepuracaoModal(false); }}
        fonogramaId={fonograma.id}
        isrcAtual={formatIsrc(fonograma.isrcFormatado)}
        novoIsrc={depuracaoData ? formatIsrc(depuracaoData.novoIsrc) : formatIsrc(fonograma.isrcFormatado)}
        paisOrigem={depuracaoData?.paisOrigem || fonograma.paisOrigem || ''}
        dataGravacao={depuracaoData?.dataGravacao}
        dataLancamento={depuracaoData?.dataLancamento}
      />

      <DeleteFonogramaModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
        isrcFormatted={formatIsrc(fonograma.isrcFormatado)}
      />

      <BloqueioModal
        isOpen={showBloqueioModal}
        onClose={() => setShowBloqueioModal(false)}
        onConfirm={(justificativa) => {
          bloquearMutation.mutate({ id: id!, justificativa }, {
            onSuccess: () => setShowBloqueioModal(false)
          });
        }}
        isLoading={bloquearMutation.isPending}
        entityName="fonograma"
      />
    </div>
  );
}
