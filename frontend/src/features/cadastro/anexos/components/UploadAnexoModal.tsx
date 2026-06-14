import { useRef, useState } from 'react';
import { Button } from '@components/ui/button';
import type { CategoriaAnexo, TipoEntidadeAnexo } from '../types/anexo';
import { CATEGORIAS_POR_ENTIDADE } from '../types/anexo';
import styles from './UploadAnexoModal.module.css';

interface Props {
  tipo: TipoEntidadeAnexo;
  onUpload: (arquivo: File, categoria: CategoriaAnexo) => Promise<void>;
  onClose: () => void;
  isUploading?: boolean;
}

export function UploadAnexoModal({ tipo, onUpload, onClose, isUploading }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [categoria, setCategoria] = useState<CategoriaAnexo | ''>('');
  const [dragOver, setDragOver] = useState(false);

  const categorias = CATEGORIAS_POR_ENTIDADE[tipo];

  function handleFile(file: File) {
    setArquivo(file);
    if (categorias.length === 1) setCategoria(categorias[0].value);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo || !categoria) return;
    await onUpload(arquivo, categoria);
  }

  const canSubmit = !!arquivo && !!categoria && !isUploading;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Adicionar Arquivo</h3>

        <form onSubmit={handleSubmit}>
          {/* Área de drop */}
          <div
            className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''} ${arquivo ? styles.hasFile : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className={styles.hiddenInput}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {arquivo ? (
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{arquivo.name}</span>
                <span className={styles.fileSize}>{(arquivo.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ) : (
              <div className={styles.dropHint}>
                <span>Arraste um arquivo ou clique para selecionar</span>
                <span className={styles.dropHintSub}>Máximo 100 MB</span>
              </div>
            )}
          </div>

          {/* Categoria */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="categoria">Categoria</label>
            <select
              id="categoria"
              className={styles.select}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaAnexo)}
              required
            >
              <option value="">Selecione uma categoria</option>
              {categorias.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isUploading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isUploading ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
