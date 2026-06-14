import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Trash2 } from 'lucide-react';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import { usePermissions } from '@shared/authz/usePermissions';
import { useAnexos } from '../hooks/useAnexos';
import { useAnexo } from '../hooks/useAnexo';
import { useUploadAnexo } from '../hooks/useUploadAnexo';
import { useRemoverAnexo } from '../hooks/useRemoverAnexo';
import { useDownloadAnexo } from '../hooks/useDownloadAnexo';
import { ScanStatusBadge } from './ScanStatusBadge';
import { UploadAnexoModal } from './UploadAnexoModal';
import type { Anexo, CategoriaAnexo, TipoEntidadeAnexo } from '../types/anexo';
import { CATEGORIA_LABELS, formatarTamanho } from '../types/anexo';
import styles from './AnexosSection.module.css';

interface Props {
  tipo: TipoEntidadeAnexo;
  entidadeId: string;
  canWrite?: boolean;
}

export function AnexosSection({ tipo, entidadeId, canWrite: canWriteProp }: Props) {
  const { can } = usePermissions();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const canUpload = canWriteProp ?? can('cadastro:default:anexo:upload');
  const canRemover = canWriteProp ?? can('cadastro:default:anexo:remover');
  const canDownload = can('cadastro:default:anexo:download');

  const [showModal, setShowModal] = useState(false);
  const [pendingAnexoId, setPendingAnexoId] = useState<string | null>(null);

  const { data: anexos = [], isLoading } = useAnexos(tipo, entidadeId);
  const uploadMutation = useUploadAnexo(tipo, entidadeId);
  const removerMutation = useRemoverAnexo(tipo, entidadeId);
  const downloadMutation = useDownloadAnexo(tipo, entidadeId);

  // Polling para o anexo recém-enviado enquanto status = pending_scan
  const { data: polledAnexo } = useAnexo(tipo, entidadeId, pendingAnexoId);
  if (polledAnexo && polledAnexo.statusScan !== 'pending_scan' && pendingAnexoId) {
    setPendingAnexoId(null);
    queryClient.invalidateQueries({ queryKey: ['anexos', tipo, entidadeId] });
  }

  async function handleUpload(arquivo: File, categoria: CategoriaAnexo) {
    try {
      const novoAnexo = await uploadMutation.mutateAsync({ arquivo, categoria });
      setShowModal(false);
      showToast('Arquivo enviado. Aguardando verificação de vírus...', 'success');
      if (novoAnexo.statusScan === 'pending_scan') {
        setPendingAnexoId(novoAnexo.id);
      }
    } catch (err: any) {
      showToast(err?.detail || 'Erro ao enviar arquivo', 'error');
    }
  }

  async function handleRemover(anexo: Anexo) {
    if (!confirm(`Remover "${anexo.nomeOriginal}"?`)) return;
    try {
      await removerMutation.mutateAsync(anexo.id);
      showToast('Arquivo removido', 'success');
    } catch {
      showToast('Erro ao remover arquivo', 'error');
    }
  }

  async function handleDownload(anexo: Anexo) {
    try {
      await downloadMutation.mutateAsync(anexo.id);
    } catch (err: any) {
      showToast(err?.detail || 'Arquivo ainda em verificação ou não disponível', 'error');
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>Arquivos</h3>
        {canUpload && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Upload size={14} />
            Adicionar
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className={styles.empty}>Carregando...</p>
      ) : anexos.length === 0 ? (
        <p className={styles.empty}>Nenhum arquivo anexado.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Arquivo</th>
              <th>Categoria</th>
              <th>Tamanho</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {anexos.map((a) => (
              <tr key={a.id}>
                <td className={styles.nomeCell} title={a.nomeOriginal}>{a.nomeOriginal}</td>
                <td>{CATEGORIA_LABELS[a.categoria]}</td>
                <td>{formatarTamanho(a.tamanhoBytes)}</td>
                <td><ScanStatusBadge status={a.statusScan} /></td>
                <td className={styles.actions}>
                  {canDownload && (
                    <button
                      className={styles.iconBtn}
                      title="Download"
                      onClick={() => handleDownload(a)}
                      disabled={a.statusScan !== 'clean' || downloadMutation.isPending}
                    >
                      <Download size={15} />
                    </button>
                  )}
                  {canRemover && (
                    <button
                      className={`${styles.iconBtn} ${styles.danger}`}
                      title="Remover"
                      onClick={() => handleRemover(a)}
                      disabled={removerMutation.isPending}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <UploadAnexoModal
          tipo={tipo}
          onUpload={handleUpload}
          onClose={() => setShowModal(false)}
          isUploading={uploadMutation.isPending}
        />
      )}
    </div>
  );
}
