import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { BuscaCadastroAutocomplete } from '../../captacoes/components/BuscaCadastroAutocomplete';
import type { ObraFonogramaSelecionado } from '../../captacoes/types/execucao';
import type { ExecucaoPendente } from '../types/pendente';
import { FormField } from '@components/ui/form-field';
import { useResolverPendente } from '../hooks/useResolverPendente';
import styles from './ResolverPendenteModal.module.css';

interface ResolverPendenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  execucao: ExecucaoPendente;
}

export function ResolverPendenteModal({ isOpen, onClose, execucao }: ResolverPendenteModalProps) {
  const [selecionado, setSelecionado] = useState<ObraFonogramaSelecionado | null>(null);
  const resolverMutation = useResolverPendente();

  useEffect(() => {
    if (isOpen) {
      setSelecionado(null);
      resolverMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, execucao]);

  if (!isOpen) return null;

  const handleConfirmar = () => {
    if (!selecionado || !selecionado.obraId) return;

    resolverMutation.mutate(
      {
        id: execucao.id,
        data: {
          obraId: selecionado.obraId,
          fonogramaId: selecionado.fonogramaId,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const isObraNaoLiberada = resolverMutation.error && (resolverMutation.error as any).code === 'OBRA_NAO_LIBERADA';

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>Resolver Execução Pendente</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.previewCard}>
            <h3 className={styles.previewTitle}>Dados da Execução Original</h3>
            <div className={styles.previewGrid}>
              <div className={styles.previewItem}>
                <span className={styles.itemLabel}>Captação / Rubrica</span>
                <span className={styles.itemValue}>{execucao.captacaoRubrica}</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.itemLabel}>Período / Horário</span>
                <span className={styles.itemValue}>{execucao.inicio || '-'} - {execucao.fim || '-'}</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.itemLabel}>Título Original</span>
                <span className={styles.itemValue}>{execucao.obraTitulo || 'Não relatado'}</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.itemLabel}>ISRC Original</span>
                <span className={styles.itemValue}>{execucao.fonogramaIsrc || 'Não relatado'}</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.itemLabel}>Intérpretes Originais</span>
                <span className={styles.itemValue}>{execucao.interpretes || 'Não relatados'}</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.itemLabel}>Quantidade</span>
                <span className={styles.itemValue}>{execucao.quantidade}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <FormField label="Buscar Obra ou Fonograma para Vinculação" required>
              <BuscaCadastroAutocomplete
                value={selecionado}
                onChange={setSelecionado}
                error={!!isObraNaoLiberada}
              />
            </FormField>
            {isObraNaoLiberada && (
              <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                A obra ou fonograma selecionado não está liberado no Cadastro. Selecione um registro liberado.
              </p>
            )}
            {resolverMutation.error && !isObraNaoLiberada && (
              <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Erro ao tentar resolver: {(resolverMutation.error as any).detail || 'Tente novamente.'}
              </p>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} disabled={resolverMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar} 
            disabled={!selecionado || resolverMutation.isPending}
          >
            {resolverMutation.isPending ? 'Resolvendo...' : 'Confirmar Resolução'}
          </Button>
        </div>
      </div>
    </div>
  );
}
