import { useState, useEffect } from 'react';
import { useUploads } from '../hooks/useUploads';
import { useUpload } from '../hooks/useUpload';
import { UploadsTable } from './UploadsTable';
import { UploadCsvButton } from './UploadCsvButton';
import { ErrosUploadPanel } from './ErrosUploadPanel';
import { Pagination } from '@/shared/components/ui/pagination/Pagination';
import type { Upload } from '../types/upload';
import styles from './UploadsSection.module.css';

interface UploadsSectionProps {
  captacaoId: string;
  captacaoAberta: boolean;
  isOwner: boolean;
  canUpload: boolean;
}

export function UploadsSection({ captacaoId, captacaoAberta, isOwner, canUpload }: UploadsSectionProps) {
  const [page, setPage] = useState(1);
  const size = 10;
  
  const [uploadAtivoId, setUploadAtivoId] = useState<string | null>(null);
  const [uploadErrosAberto, setUploadErrosAberto] = useState<Upload | null>(null);

  const { data: uploadsList, isLoading, isError } = useUploads(captacaoId, page, size);
  
  // Polling via hook if upload is active
  useUpload(captacaoId, uploadAtivoId);

  // Auto clear uploadAtivoId if the newest fetches show it's done or if it's no longer Processando
  useEffect(() => {
    if (uploadAtivoId && uploadsList?.data) {
      const activeUpload = uploadsList.data.find(u => u.id === uploadAtivoId);
      if (activeUpload && activeUpload.status !== 'Processando') {
        setUploadAtivoId(null);
      }
    }
  }, [uploadsList, uploadAtivoId]);

  // Se tem algum upload na base que está PROCESSANDO (caso a pessoa de f5)
  useEffect(() => {
    if (!uploadAtivoId && uploadsList?.data) {
      const processing = uploadsList.data.find(u => u.status === 'Processando');
      if (processing) {
        setUploadAtivoId(processing.id);
      }
    }
  }, [uploadsList, uploadAtivoId]);

  const handleUploadStart = (id: string) => {
    setUploadAtivoId(id);
    setPage(1); // Go to first page to see the new upload
    setUploadErrosAberto(null);
  };

  const handleExpandErrors = (upload: Upload) => {
    setUploadErrosAberto(upload.id === uploadErrosAberto?.id ? null : upload);
  };

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div className={styles.titleInfo}>
          <h3>Arquivos de Execução</h3>
          <p>Importe ou verifique o histórico de uploads CSV de execuções (obras e fonogramas).</p>
        </div>
        <div className={styles.actions}>
          {canUpload && isOwner && (
            <UploadCsvButton 
              captacaoId={captacaoId} 
              onUploadStart={handleUploadStart}
              disabled={!!uploadAtivoId || !captacaoAberta}
            />
          )}
        </div>
      </header>
      
      {uploadErrosAberto && (
        <div className={styles.panelContainer}>
          <ErrosUploadPanel 
            upload={uploadErrosAberto} 
            onClose={() => setUploadErrosAberto(null)} 
          />
        </div>
      )}

      {isLoading && <div className={styles.loading}>Carregando histórico...</div>}
      {isError && <div className={styles.error}>Ocorreu um erro ao carregar os uploads.</div>}

      {!isLoading && !isError && uploadsList && (
        <>
          <UploadsTable 
            uploads={uploadsList.data} 
            onExpandErrors={handleExpandErrors}
            errosExpandidoId={uploadErrosAberto?.id ?? null}
          />
          {uploadsList.pagination.total > size && (
            <div className={styles.pagination}>
              <Pagination
                pagination={{
                  page,
                  size,
                  total: uploadsList.pagination.total,
                  totalPages: Math.ceil(uploadsList.pagination.total / size) 
                }}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
