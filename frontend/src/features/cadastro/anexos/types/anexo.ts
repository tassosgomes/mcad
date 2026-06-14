export type TipoEntidadeAnexo = 'Obra' | 'Fonograma' | 'Titular';

export type CategoriaAnexo =
  | 'LetraObra'
  | 'OutroDocumentoObra'
  | 'AudioFonograma'
  | 'OutroDocumentoFonograma'
  | 'DocumentoIdentificacao'
  | 'Contrato'
  | 'OutroDocumentoTitular';

export type StatusAnexoScan = 'pending_scan' | 'clean' | 'infected';

export interface Anexo {
  id: string;
  storageFileId: string;
  entidadeTipo: TipoEntidadeAnexo;
  entidadeId: string;
  categoria: CategoriaAnexo;
  nomeOriginal: string;
  contentType: string;
  tamanhoBytes: number;
  statusScan: StatusAnexoScan;
  uploadadoPor: string;
  criadoEm: string;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresAt: string;
}

export const CATEGORIAS_POR_ENTIDADE: Record<TipoEntidadeAnexo, { value: CategoriaAnexo; label: string }[]> = {
  Obra: [
    { value: 'LetraObra', label: 'Letra da Obra' },
    { value: 'OutroDocumentoObra', label: 'Outro Documento' },
  ],
  Fonograma: [
    { value: 'AudioFonograma', label: 'Áudio do Fonograma' },
    { value: 'OutroDocumentoFonograma', label: 'Outro Documento' },
  ],
  Titular: [
    { value: 'DocumentoIdentificacao', label: 'Documento de Identificação (RG/CNH)' },
    { value: 'Contrato', label: 'Contrato' },
    { value: 'OutroDocumentoTitular', label: 'Outro Documento' },
  ],
};

export const CATEGORIA_LABELS: Record<CategoriaAnexo, string> = {
  LetraObra: 'Letra da Obra',
  OutroDocumentoObra: 'Outro Documento',
  AudioFonograma: 'Áudio do Fonograma',
  OutroDocumentoFonograma: 'Outro Documento',
  DocumentoIdentificacao: 'Documento de Identificação',
  Contrato: 'Contrato',
  OutroDocumentoTitular: 'Outro Documento',
};

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
