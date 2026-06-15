import { useState } from 'react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Select } from '@components/ui/select';
import { TextInput } from '@components/ui/text-input';
import { Pagination } from '@components/ui/pagination';
import { Modal } from '@components/ui/modal';
import { useToast } from '@components/ui/toast';
import { Can } from '@shared/authz/Can';
import { useSolicitacoes } from '../hooks/useSolicitacoes';
import { useAprovarSolicitacao } from '../hooks/useAprovarSolicitacao';
import { useRejeitarSolicitacao } from '../hooks/useRejeitarSolicitacao';
import type {
  SolicitacaoAlteracao,
  SolicitacaoFiltros,
  SolicitacaoStatus,
  SolicitacaoCampo,
} from '../types/solicitacao';
import styles from './SolicitacoesPage.module.css';

const STATUS_LABEL: Record<SolicitacaoStatus, string> = {
  SOLICITADA: 'Solicitada',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
};

const STATUS_VARIANT: Record<SolicitacaoStatus, 'warning' | 'success' | 'error'> = {
  SOLICITADA: 'warning',
  APROVADA: 'success',
  REJEITADA: 'error',
};

const CAMPO_LABEL: Record<SolicitacaoCampo, string> = {
  NOME: 'Nome',
  CAE_IPI: 'CAE/IPI',
  ASSOCIACAO: 'Associação',
  CATEGORIA: 'Categoria',
};

const STATUS_OPTIONS: { value: SolicitacaoStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'SOLICITADA', label: 'Solicitada' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'REJEITADA', label: 'Rejeitada' },
];

export function SolicitacoesPage() {
  const { showToast } = useToast();
  const [filtros, setFiltros] = useState<SolicitacaoFiltros>({ page: 1, size: 20, sort: 'criadoEm' });
  const { data, isLoading, error, refetch } = useSolicitacoes(filtros);
  const aprovarMutation = useAprovarSolicitacao();
  const rejeitarMutation = useRejeitarSolicitacao();

  const [aprovarTarget, setAprovarTarget] = useState<SolicitacaoAlteracao | null>(null);
  const [rejeitarTarget, setRejeitarTarget] = useState<SolicitacaoAlteracao | null>(null);
  const [justificativaRejeicao, setJustificativaRejeicao] = useState('');

  const handleAprovar = async () => {
    if (!aprovarTarget) return;
    try {
      await aprovarMutation.mutateAsync(aprovarTarget.id);
      showToast('Solicitação aprovada', 'success');
      setAprovarTarget(null);
      refetch();
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao aprovar solicitação', 'error');
    }
  };

  const handleRejeitar = async () => {
    if (!rejeitarTarget) return;
    try {
      await rejeitarMutation.mutateAsync({
        id: rejeitarTarget.id,
        justificativa: justificativaRejeicao,
      });
      showToast('Solicitação rejeitada', 'success');
      setRejeitarTarget(null);
      setJustificativaRejeicao('');
      refetch();
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao rejeitar solicitação', 'error');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Solicitações de Alteração"
        description="Revise e decida sobre solicitações de alteração de dados sensíveis enviadas pelos titulares."
      />

      <div className={styles.filters}>
        <TextInput
          placeholder="Buscar por titular..."
          value={filtros.titularNome ?? ''}
          onChange={(val) => setFiltros((prev) => ({ ...prev, titularNome: val || undefined, page: 1 }))}
          aria-label="Filtrar por titular"
        />
        <Select<SolicitacaoStatus | ''>
          value={filtros.status ?? ''}
          onChange={(val) =>
            setFiltros((prev) => ({ ...prev, status: (val as SolicitacaoStatus) || undefined, page: 1 }))
          }
          options={STATUS_OPTIONS}
          placeholder="Todos os status"
          aria-label="Filtrar por status"
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message="Erro ao carregar solicitações" onRetry={refetch} />
      ) : data && data.data.length === 0 ? (
        <div className={styles.empty}>
          <p>Nenhuma solicitação de alteração encontrada.</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>TITULAR</th>
                  <th className={styles.th}>CAMPO</th>
                  <th className={styles.th}>VALOR ATUAL → PRETENDIDO</th>
                  <th className={styles.th}>JUSTIFICATIVA</th>
                  <th className={styles.th}>STATUS</th>
                  <th className={`${styles.th} ${styles.textRight}`}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((sol) => (
                  <tr key={sol.id} className={styles.row}>
                    <td className={styles.td}>
                      <span className={styles.nome}>{sol.titularNome}</span>
                    </td>
                    <td className={styles.td}>
                      <span>{CAMPO_LABEL[sol.campo]}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.diff}>
                        <span className={styles.oldValue}>{sol.valorAtual}</span>
                        <span className={styles.arrow}>→</span>
                        <span className={styles.newValue}>{sol.valorPretendido}</span>
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span>{sol.justificativa}</span>
                    </td>
                    <td className={styles.td}>
                      <Badge variant={STATUS_VARIANT[sol.status]}>{STATUS_LABEL[sol.status]}</Badge>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        {sol.status === 'SOLICITADA' && (
                          <>
                            <Can permission="cadastro:default:solicitacao-alteracao:aprovar">
                              <Button
                                variant="primary"
                                size="sm"
                                type="button"
                                onClick={() => setAprovarTarget(sol)}
                              >
                                Aprovar
                              </Button>
                            </Can>
                            <Can permission="cadastro:default:solicitacao-alteracao:rejeitar">
                              <Button
                                variant="danger"
                                size="sm"
                                type="button"
                                onClick={() => {
                                  setRejeitarTarget(sol);
                                  setJustificativaRejeicao('');
                                }}
                              >
                                Rejeitar
                              </Button>
                            </Can>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && (
            <Pagination
              pagination={data.pagination}
              onPageChange={(page) => setFiltros((prev) => ({ ...prev, page }))}
            />
          )}
        </>
      )}

      {/* Modal de confirmação de aprovação */}
      <Modal
        isOpen={!!aprovarTarget}
        onClose={() => setAprovarTarget(null)}
        title="Confirmar Aprovação"
        actions={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setAprovarTarget(null)}
              disabled={aprovarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleAprovar}
              disabled={aprovarMutation.isPending}
            >
              Confirmar Aprovação
            </Button>
          </>
        }
      >
        {aprovarTarget && (
          <>
            <p>Confirme a alteração do dado sensível abaixo:</p>
            <div className={styles.modalDiff}>
              <div className={styles.diffRow}>
                <span className={styles.diffLabel}>Titular</span>
                <span>{aprovarTarget.titularNome}</span>
              </div>
              <div className={styles.diffRow}>
                <span className={styles.diffLabel}>Campo</span>
                <span>{CAMPO_LABEL[aprovarTarget.campo]}</span>
              </div>
              <div className={styles.diffRow}>
                <span className={styles.diffLabel}>Alteração</span>
                <span className={styles.diffValues}>
                  <span className={styles.oldValue}>{aprovarTarget.valorAtual}</span>
                  <span className={styles.arrow}>→</span>
                  <span className={styles.newValue}>{aprovarTarget.valorPretendido}</span>
                </span>
              </div>
              <div className={styles.diffRow}>
                <span className={styles.diffLabel}>Justificativa</span>
                <span>{aprovarTarget.justificativa}</span>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Modal de rejeição */}
      <Modal
        isOpen={!!rejeitarTarget}
        onClose={() => { setRejeitarTarget(null); setJustificativaRejeicao(''); }}
        title="Rejeitar Solicitação"
        actions={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => { setRejeitarTarget(null); setJustificativaRejeicao(''); }}
              disabled={rejeitarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleRejeitar}
              disabled={!justificativaRejeicao.trim() || rejeitarMutation.isPending}
            >
              Confirmar Rejeição
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          <p>Informe a justificativa da rejeição para o titular:</p>
          <TextInput
            value={justificativaRejeicao}
            onChange={setJustificativaRejeicao}
            placeholder="Justificativa da rejeição..."
            aria-label="Justificativa de rejeição"
          />
        </div>
      </Modal>
    </div>
  );
}
