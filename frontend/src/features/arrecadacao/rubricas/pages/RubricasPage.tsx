import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@components/ui/button';
import { ErrorState } from '@components/ui/error-state';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { usePermissions } from '@shared/authz';
import { RubricasTable } from '../components/RubricasTable';
import { InativarRubricaModal, type AcaoStatusRubrica } from '../components/InativarRubricaModal';
import { useRubricas } from '../hooks/useRubricas';
import type { Rubrica } from '../types/rubrica';
import styles from './RubricasPage.module.css';

export function RubricasPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const canWrite = can('arrecadacao:default:rubrica:editar');
  const { data, isLoading, error, refetch } = useRubricas();
  const [modalAcao, setModalAcao] = useState<AcaoStatusRubrica | null>(null);
  const [modalRubrica, setModalRubrica] = useState<Rubrica | null>(null);

  function handleInativar(rubrica: Rubrica) {
    setModalAcao('inativar');
    setModalRubrica(rubrica);
  }

  function handleAtivar(rubrica: Rubrica) {
    setModalAcao('ativar');
    setModalRubrica(rubrica);
  }

  function handleCloseModal() {
    setModalAcao(null);
    setModalRubrica(null);
  }

  function handleSuccessModal() {
    const message = modalAcao === 'inativar' ? 'Rubrica inativada com sucesso' : 'Rubrica reativada com sucesso';
    showToast(message, 'success');
    handleCloseModal();
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Rubricas"
        description="Cadastre e gerencie as rubricas de arrecadação."
        action={
          canWrite ? (
            <Button
              variant="primary"
              onClick={() => navigate('/arrecadacao/rubricas/nova')}
              type="button"
              id="btn-nova-rubrica"
            >
              <Plus size={16} /> Nova Rubrica
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message="Erro ao carregar rubricas" onRetry={refetch} />
      ) : (
        <RubricasTable
          data={data ?? []}
          onInativar={handleInativar}
          onAtivar={handleAtivar}
        />
      )}

      {modalAcao && modalRubrica && (
        <InativarRubricaModal
          acao={modalAcao}
          rubricaId={modalRubrica.id}
          rubricaNome={modalRubrica.nome}
          isOpen
          onClose={handleCloseModal}
          onSuccess={handleSuccessModal}
        />
      )}
    </div>
  );
}
