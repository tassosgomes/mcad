import { useEffect, useState } from 'react';
import { useErrosUpload } from '../hooks/useErrosUpload';
import { Pagination } from '@/shared/components/ui/pagination/Pagination';
import styles from './ErrosUploadPanel.module.css';
import type { Upload } from '../types/upload';

interface ErrosUploadPanelProps {
  upload: Upload;
  onClose: () => void;
}

export function ErrosUploadPanel({ upload, onClose }: ErrosUploadPanelProps) {
  const [page, setPage] = useState(1);
  const size = 50;

  const { data: errosList, isLoading, isError } = useErrosUpload(upload.captacaoId, upload.id, page, size);

  // Reset pagination if upload changes
  useEffect(() => {
    setPage(1);
  }, [upload.id]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.titleInfo}>
          <h4>Relatório de Erros</h4>
          <span className={styles.subtitle}>
            Arquivo: <strong>{upload.nomeArquivo}</strong> — {upload.totalErros} erro(s) identificado(s)
          </span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar painel">✕</button>
      </div>

      <div className={styles.panelBody}>
        {isLoading && <div className={styles.message}>Carregando erros...</div>}
        {isError && <div className={styles.messageError}>Não foi possível carregar os erros.</div>}
        
        {!isLoading && !isError && errosList && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Coluna</th>
                    <th>Descrição do Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {errosList.items.map((erro) => (
                    <tr key={erro.id}>
                      <td>{erro.linha === 0 || erro.linha === null ? '-' : erro.linha}</td>
                      <td>{erro.coluna || '-'}</td>
                      <td>{erro.mensagem}</td>
                    </tr>
                  ))}
                  {errosList.items.length === 0 && (
                    <tr>
                      <td colSpan={3} className={styles.center}>Nenhum detalhe de erro disponível.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {errosList.total > size && (
              <div className={styles.paginationWrapper}>
                <Pagination
                  pagination={{
                    page,
                    size,
                    total: errosList.total,
                    totalPages: Math.ceil(errosList.total / size)
                  }}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
