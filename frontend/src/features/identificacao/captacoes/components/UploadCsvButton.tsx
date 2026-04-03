import { useRef } from 'react';
import { Button } from '@/shared/components/ui/button/Button';
import { useUploadCsv } from '../hooks/useUploadCsv';
import styles from './UploadCsvButton.module.css';

interface UploadCsvButtonProps {
  captacaoId: string;
  onUploadStart: (uploadId: string) => void;
  disabled?: boolean;
}

export function UploadCsvButton({ captacaoId, onUploadStart, disabled }: UploadCsvButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadCsv();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Por favor, selecione um arquivo .csv');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    try {
      const response = await uploadMutation.mutateAsync({ captacaoId, arquivo: file });
      onUploadStart(response.id);
    } catch (err: any) {
      alert(err.detail || 'Erro ao iniciar upload');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={styles.container}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploadMutation.isPending}
      >
        {uploadMutation.isPending ? 'Enviando...' : 'Importar CSV'}
      </Button>
    </div>
  );
}
