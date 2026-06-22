import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { FormField } from '@components/ui/form-field';
import { BuscaCadastroAutocomplete } from '../../captacoes/components/BuscaCadastroAutocomplete';
import { pendentesApi } from '../api/pendentesApi';
import type { ObraFonogramaSelecionado } from '../../captacoes/types/execucao';
import type { ImpactoPendente, ExecucaoPendente, ResolverLoteResponse } from '../types/pendente';
import { useResolverPendentesEmLote } from '../hooks/useResolverPendentesEmLote';
import modalStyles from './ResolverPendenteModal.module.css'; // reutiliza os estilos globais do modal
import styles from './ResolverLoteModal.module.css';

interface ResolverLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  impactoItem: ImpactoPendente;
}

export function ResolverLoteModal({ isOpen, onClose, impactoItem }: ResolverLoteModalProps) {
  const [selecionado, setSelecionado] = useState<ObraFonogramaSelecionado | null>(null);
  const [execucoes, setExecucoes] = useState<ExecucaoPendente[]>([]);
  const [selecionadasIds, setSelecionadasIds] = useState<string[]>([]);
  const [isLoadingExecucoes, setIsLoadingExecucoes] = useState(false);
  const [resultado, setResultado] = useState<ResolverLoteResponse | null>(null);

  const resolverLoteMutation = useResolverPendentesEmLote();

  useEffect(() => {
    if (isOpen) {
      setSelecionado(null);
      setResultado(null);
      resolverLoteMutation.reset();
      carregarExecucoes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, impactoItem]);

  const carregarExecucoes = async () => {
    setIsLoadingExecucoes(true);
    try {
      // Busca as execuções associadas a este ISRC/ISWC usando q= e paginacao alta
      const result = await pendentesApi.getPendentes({ q: impactoItem.identificador, size: 50 });
      const fetches = result.data;
      setExecucoes(fetches);
      
      // Auto-seleciona todas as abertas
      const abertas = fetches.filter(e => e.captacaoStatus?.toUpperCase() === 'ABERTA').map(e => e.id);
      setSelecionadasIds(abertas);
    } catch (e) {
      console.error('Failed to load execucoes for lote', e);
    } finally {
      setIsLoadingExecucoes(false);
    }
  };

  if (!isOpen) return null;

  const handleConfirmar = () => {
    if (!selecionado || !selecionado.obraId || selecionadasIds.length === 0) return;

    resolverLoteMutation.mutate(
      {
        execucaoIds: selecionadasIds,
        obraId: selecionado.obraId,
        fonogramaId: selecionado.fonogramaId,
      },
      {
        onSuccess: (res) => {
          setResultado(res);
        },
      }
    );
  };

  const toggleSelecionada = (id: string) => {
    setSelecionadasIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleClose = () => {
    // Se houve resultado com resolvidas, e o usuario fechar, pode considerar que ele confirmou lendo
    onClose();
  };

  const isObraNaoLiberada = resolverLoteMutation.error && (resolverLoteMutation.error as any).code === 'OBRA_NAO_LIBERADA';

  return (
    <div className={modalStyles.overlay}>
      <div className={modalStyles.modal} role="dialog" aria-modal="true">
        <div className={modalStyles.header}>
          <h2 className={modalStyles.title}>Resolução em Lote</h2>
          <button className={modalStyles.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className={modalStyles.content}>
          {!resultado ? (
            <>
              <div>
                <h3 className={modalStyles.previewTitle}>Impacto Selecionado</h3>
                <p style={{ fontSize: '0.875rem' }}>
                  Identificador: <strong>{impactoItem.identificador}</strong> ({impactoItem.tipoIdentificador})
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  {impactoItem.totalExecucoes} execuções afetando {impactoItem.totalCaptacoes} captações.
                </p>
              </div>

              <FormField label="Buscar Obra ou Fonograma para Vincular a Todas" required>
                <BuscaCadastroAutocomplete
                  value={selecionado}
                  onChange={setSelecionado}
                  error={!!isObraNaoLiberada}
                />
              </FormField>
              {isObraNaoLiberada && (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>
                  A obra ou fonograma selecionado não está liberado no Cadastro. Selecione um registro liberado.
                </p>
              )}

              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Selecione as execuções para resolver ({selecionadasIds.length} selecionadas):
                </h4>
                {isLoadingExecucoes ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Carregando execuções...</p>
                ) : (
                  <div className={styles.checkboxList}>
                    {execucoes.map(exec => {
                      const disabled = exec.captacaoStatus?.toUpperCase() !== 'ABERTA';
                      return (
                        <label 
                          key={exec.id} 
                          className={`${styles.checkboxItem} ${disabled ? styles.disabled : ''}`}
                        >
                          <input
                            type="checkbox"
                            className={styles.checkboxInput}
                            checked={selecionadasIds.includes(exec.id)}
                            disabled={disabled}
                            onChange={() => toggleSelecionada(exec.id)}
                          />
                          <div className={styles.itemLabel}>
                            <span>
                              {exec.captacaoRubrica} — {exec.inicio || '-'} às {exec.fim || '-'}
                            </span>
                            {disabled && (
                              <span className={styles.motivo}>(captação {exec.captacaoStatus})</span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.resultBox}>
              <h3 className={styles.resultTitle}>Resultado da Resolução em Lote</h3>
              <p className={styles.resultResolvidas}>✅ {resultado.resolvidas} execuções resolvidas com sucesso.</p>
              
              {resultado.rejeitadas > 0 && (
                <p className={styles.resultRejeitadas}>❌ {resultado.rejeitadas} execuções rejeitadas.</p>
              )}
              
              {resultado.detalhesRejeitadas && resultado.detalhesRejeitadas.length > 0 && (
                <ul className={styles.resultDetalhes}>
                  {resultado.detalhesRejeitadas.map((r, idx) => (
                    <li key={idx}>— Motivo: {r.motivo} (ID: {r.execucaoId.substring(0, 8)}...)</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className={modalStyles.footer}>
          {resultado ? (
            <Button onClick={handleClose}>Concluir</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleClose} disabled={resolverLoteMutation.isPending}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmar} 
                disabled={!selecionado || selecionadasIds.length === 0 || resolverLoteMutation.isPending}
              >
                {resolverLoteMutation.isPending ? 'Resolvendo...' : 'Resolver Selecionadas'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
