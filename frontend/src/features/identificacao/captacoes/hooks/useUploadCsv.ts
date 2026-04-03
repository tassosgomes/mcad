import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadCsv } from '../api/uploadsApi';

interface UploadCsvParams {
  captacaoId: string;
  arquivo: File;
}

export function useUploadCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ captacaoId, arquivo }: UploadCsvParams) => uploadCsv(captacaoId, arquivo),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['uploads', variables.captacaoId] });
    },
  });
}
