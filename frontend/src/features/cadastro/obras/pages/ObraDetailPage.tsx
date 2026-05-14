import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { useToast } from '@components/ui/toast';
import { Badge } from '@components/ui/badge';
import { usePermissions } from '@shared/authz/usePermissions';
import { useObra } from '../hooks/useObra';
import { useUpdateObra } from '../hooks/useUpdateObra';
import { useDeleteObra } from '../hooks/useDeleteObra';
import { useLiberarObra } from '../hooks/useLiberarObra';
import { useBloquearObra } from '../hooks/useBloquearObra';
import { useDesbloquearObra } from '../hooks/useDesbloquearObra';
import { useHistoricoObra } from '../hooks/useHistoricoObra';

import { LiberarButton, BloquearButton, DesbloquearButton } from '@shared/components/ui/status-actions';
import { BloqueioBanner } from '@shared/components/ui/bloqueio-banner';
import { BloqueioModal } from '@shared/components/ui/bloqueio-modal';
import { ChecklistPreRequisitos } from '@shared/components/ui/checklist-prereqs';
import { HistoricoBloqueios } from '@shared/components/ui/historico-bloqueios';

import { ObraForm } from '../components/ObraForm';
import { IswcSection } from '../components/IswcSection';
import { DepuracaoBanner } from '../components/DepuracaoBanner';
import { DepuracaoModal } from '../components/DepuracaoModal';
import { DominioPublicoToggle } from '../components/DominioPublicoToggle';
import { DeleteObraModal } from '../components/DeleteObraModal';
import { TitularidadesSection, useTitularidades } from '@features/cadastro/titularidades';
import { ObraFonogramasSection } from '@features/cadastro/fonogramas';
import type { AtualizarObraRequest, DepurarObraRequest } from '../types/obra';
import styles from './ObraDetailPage.module.css';

const STATUS_VARIANT: Record<string, string> = {
  PENDENTE: 'warning',
  LIBERADO: 'success',
  BLOQUEADO: 'error',
  DOMINIO_PUBLICO: 'muted',
  DEPURADA: 'secondary',
};

export function ObraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canEdit = can('cadastro:default:obra:editar');
  const canDelete = can('cadastro:default:obra:excluir');
  const canLiberar = can('cadastro:default:status:liberar-obra');
  const canBloquear = can('cadastro:default:status:bloquear-obra');
  const canDesbloquear = can('cadastro:default:status:desbloquear-obra');
  // Aggregate gate for sub-sections (TitularidadesSection, ObraFonogramasSection,
  // IswcSection, DominioPublicoToggle) — each evaluates its own granular permissions
  // internally; we forward "can edit obra" as the high-level write capability.
  const canWrite = canEdit;
  
  const { data: obra, isLoading, error, refetch } = useObra(id);
  const updateMutation = useUpdateObra();
  const deleteMutation = useDeleteObra();

  const liberarMutation = useLiberarObra();
  const bloquearMutation = useBloquearObra();
  const desbloquearMutation = useDesbloquearObra();
  const { data: historico } = useHistoricoObra(id!);

  // F04 — Titularidades: temTitulares real para IswcSection
  const { data: titularidadesData } = useTitularidades(id ?? '');
  const temTitulares = (titularidadesData?.titularidades.length ?? 0) > 0;

  // Modals state
  const [depuracaoData, setDepuracaoData] = useState<DepurarObraRequest | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDepuracaoModalForTitularidades, setShowDepuracaoModalForTitularidades] = useState(false);
  const [showBloqueioModal, setShowBloqueioModal] = useState(false);
  
  const [pendenciasValidacao, setPendenciasValidacao] = useState<import('../types/obra').PreRequisitoItem[]>([]);

  async function handleSubmit(data: AtualizarObraRequest) {
    if (!obra) return;
    try {
      await updateMutation.mutateAsync({ id: obra.id, data });
      showToast('Obra atualizada com sucesso', 'success');
    } catch (err: unknown) {
      const problem = err as { code?: string; detail?: string };
      if (problem.code === 'DEPURACAO_NECESSARIA') {
        // Trigger depuração flow
        setDepuracaoData({
          titulo: data.titulo,
          tipo: data.tipo,
          subtitulo: data.subtitulo || null,
          genero: data.genero || null,
        });
      } else {
        showToast(problem.detail || 'Erro ao atualizar obra', 'error');
      }
    }
  }

  async function handleDelete() {
    if (!obra) return;
    try {
      await deleteMutation.mutateAsync(obra.id);
      showToast('Obra excluída com sucesso', 'success');
      navigate('/cadastro/obras');
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao excluir obra', 'error');
    }
  }

  if (isLoading) return <Loading />;
  if (error || !obra) return <ErrorState message="Obra não encontrada" onRetry={refetch} />;

  const isReadOnly = obra.status === 'DEPURADA' || obra.status === 'DOMINIO_PUBLICO' || obra.status === 'BLOQUEADO';

  const handleLiberar = async () => {
    if (!obra) return;
    try {
      setPendenciasValidacao([]);
      await liberarMutation.mutateAsync(obra.id);
    } catch (err: any) {
      if (err.status === 422 && err.pendencias) {
        setPendenciasValidacao(err.pendencias);
        showToast('Pré-requisitos não atendidos. Verifique a lista.', 'error');
      } else {
        showToast(err.detail || 'Erro ao liberar obra', 'error');
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/cadastro/obras')}
          type="button"
        >
          <ArrowLeft size={16} /> Obras Musicais
        </Button>
        <PageHeader
          title={`Obra #${obra.codigo}`}
          description={`${obra.titulo} ${obra.subtitulo ? ` - ${obra.subtitulo}` : ''} | ${obra.tipo}`}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Badge variant={STATUS_VARIANT[obra.status] as any}>{obra.status}</Badge>
              
              {(canLiberar || canBloquear || canDesbloquear) && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {obra.status === 'PENDENTE' && canLiberar && (
                    <LiberarButton onClick={handleLiberar} isLoading={liberarMutation.isPending} />
                  )}
                  {(obra.status === 'PENDENTE' || obra.status === 'LIBERADO') && canBloquear && (
                    <BloquearButton onClick={() => setShowBloqueioModal(true)} />
                  )}
                  {obra.status === 'BLOQUEADO' && canDesbloquear && (
                    <DesbloquearButton onClick={() => desbloquearMutation.mutate(obra.id)} isLoading={desbloquearMutation.isPending} />
                  )}
                </div>
              )}

              {canDelete && !isReadOnly && obra.status !== 'BLOQUEADO' && (
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                  type="button"
                  disabled={obra.status === 'DEPURADA'}
                >
                  <Trash2 size={16} /> Excluir
                </Button>
              )}
            </div>
          }
        />
      </div>

      {obra.status === 'BLOQUEADO' && obra.bloqueioJustificativa && (
        <BloqueioBanner justificativa={obra.bloqueioJustificativa} />
      )}
      
      {pendenciasValidacao.length > 0 && (
        <ChecklistPreRequisitos pendencias={pendenciasValidacao} />
      )}

      {obra.status === 'DEPURADA' && obra.obraDepuradaParaId && (
        <DepuracaoBanner obraDepuradaParaId={obra.obraDepuradaParaId} />
      )}

      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <ObraForm
              initialData={obra}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/cadastro/obras')}
              isSubmitting={updateMutation.isPending}
            />
          </div>

          {/* F04 — Seção Titulares Autorais */}
          <TitularidadesSection
            obraId={obra.id}
            obraStatus={obra.status}
            canWrite={canWrite}
            onDepuracaoRequired={() => setShowDepuracaoModalForTitularidades(true)}
          />

          {/* F05 — Seção Fonogramas */}
          <ObraFonogramasSection
            obraId={obra.id}
            obraStatus={obra.status}
            canWrite={canWrite}
          />
        </div>
        <div className={styles.rightCol}>
          {/* F04 — temTitulares real (não mais placeholder) */}
          <IswcSection obra={obra} temTitulares={temTitulares} canWrite={canWrite} />
          
          {(obra.status === 'PENDENTE' || obra.status === 'LIBERADO' || obra.status === 'DOMINIO_PUBLICO') && (
            <div className={styles.rightPanel}>
              <h3 style={{ fontSize: '14px', marginBottom: '16px', fontWeight: 600 }}>Propriedades</h3>
              <DominioPublicoToggle obra={obra} canWrite={canWrite} />
            </div>
          )}
        </div>
      </div>

      <HistoricoBloqueios items={historico ?? []} />

      <DepuracaoModal
        isOpen={!!depuracaoData}
        onClose={() => setDepuracaoData(null)}
        obraId={obra.id}
        updatedData={depuracaoData}
      />

      {/* F04 — Depuração disparada por alteração de titularidades */}
      <DepuracaoModal
        isOpen={showDepuracaoModalForTitularidades}
        onClose={() => setShowDepuracaoModalForTitularidades(false)}
        obraId={obra.id}
        updatedData={{
          titulo: obra.titulo,
          tipo: obra.tipo,
          subtitulo: obra.subtitulo || null,
          genero: obra.genero || null,
        }}
      />

      <DeleteObraModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
        obra={obra}
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
        entityName="obra"
      />
    </div>
  );
}
