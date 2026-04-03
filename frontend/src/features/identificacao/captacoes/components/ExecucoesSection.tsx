import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useExecucoes } from '../hooks/useExecucoes';
import { ExecucoesTable } from './ExecucoesTable';
import { ExecucaoFormModal } from './ExecucaoFormModal';
import { DeleteExecucaoModal } from './DeleteExecucaoModal';
import type { FiltrosExecucao, Execucao } from '../types/execucao';
import type { Captacao } from '../types/captacao';
import styles from './ExecucoesSection.module.css';

interface ExecucoesSectionProps {
  captacao: Captacao;
  canWrite: boolean;
  currentUserId: string;
}

export function ExecucoesSection({
  captacao,
  canWrite,
  currentUserId,
}: ExecucoesSectionProps) {
  const [filtros, setFiltros] = useState<FiltrosExecucao>({ page: 1, size: 20, sort: 'inicio' });
  
  const [execucaoParaEditar, setExecucaoParaEditar] = useState<Execucao | null>(null);
  const [execucaoParaExcluir, setExecucaoParaExcluir] = useState<Execucao | null>(null);
  
  const [showFormModal, setShowFormModal] = useState(false);

  const { data, isLoading, isError } = useExecucoes(captacao.id, filtros);

  const isCaptacaoAberta = captacao.status === 'ABERTA';
  const isResponsavel = captacao.analistaResponsavel.id === currentUserId;
  const canAdd = canWrite && isCaptacaoAberta && isResponsavel;

  const handleSortChange = (sort: string) => {
    setFiltros((prev) => ({ ...prev, sort, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFiltros((prev) => ({ ...prev, page: newPage }));
  };

  const handleOpenAdd = () => {
    setExecucaoParaEditar(null);
    setShowFormModal(true);
  };

  const handleEdit = (execucao: Execucao) => {
    setExecucaoParaEditar(execucao);
    setShowFormModal(true);
  };

  const handleCloseForm = () => {
    setShowFormModal(false);
    setExecucaoParaEditar(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Execuções</h2>
        
        <div className={styles.headerActions}>
          <div className={styles.filters}>
            <select
              className={styles.filterSelect}
              value={filtros.status || ''}
              onChange={(e) => setFiltros((prev) => ({ ...prev, status: e.target.value || undefined, page: 1 }))}
            >
              <option value="">Todos os status</option>
              <option value="Identificada">Identificada</option>
              <option value="Pendente">Pendente</option>
            </select>
          </div>

          {canAdd && (
            <button className={styles.btnAdd} onClick={handleOpenAdd}>
              <Plus size={16} />
              Adicionar Execução
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Carregando execuções...</div>
      ) : isError ? (
        <div className={styles.error}>Ocorreu um erro ao carregar as execuções.</div>
      ) : (
        <>
          <ExecucoesTable
            data={data?.items || []}
            captacao={captacao}
            canWrite={canWrite}
            currentUserId={currentUserId}
            sort={filtros.sort || 'inicio'}
            onSortChange={handleSortChange}
            onEdit={handleEdit}
            onDelete={setExecucaoParaExcluir}
          />

          {data && data.total > (filtros.size || 20) && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => handlePageChange((filtros.page || 1) - 1)}
                disabled={(filtros.page || 1) === 1}
              >
                Anterior
              </button>
              <span className={styles.pageInfo}>
                Página {filtros.page || 1} de {Math.ceil(data.total / (filtros.size || 20))}
              </span>
              <button
                className={styles.pageBtn}
                onClick={() => handlePageChange((filtros.page || 1) + 1)}
                disabled={(filtros.page || 1) >= Math.ceil(data.total / (filtros.size || 20))}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {showFormModal && (
        <ExecucaoFormModal
          isOpen={showFormModal}
          onClose={handleCloseForm}
          captacaoId={captacao.id}
          rubrica={captacao.rubrica}
          initialData={execucaoParaEditar}
        />
      )}

      {execucaoParaExcluir && (
        <DeleteExecucaoModal
          isOpen={!!execucaoParaExcluir}
          onClose={() => setExecucaoParaExcluir(null)}
          captacaoId={captacao.id}
          execucao={execucaoParaExcluir}
        />
      )}
    </div>
  );
}
