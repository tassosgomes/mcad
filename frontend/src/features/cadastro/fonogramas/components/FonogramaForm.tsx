import { useState, FormEvent } from 'react';
import { usePermissions } from '@shared/authz/usePermissions';
import { ObraSelect } from './ObraSelect';
import { isValidIsrc } from '../utils/isrcValidator';
import type { Fonograma } from '../types/fonograma';
import styles from './FonogramaForm.module.css';

interface FonogramaFormProps {
  initialData?: Fonograma;
  initialObraId?: string;
  initialObraTitulo?: string;
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
}

export function FonogramaForm({ initialData, initialObraId, initialObraTitulo, onSubmit, isLoading }: FonogramaFormProps) {
  const { can } = usePermissions();
  const isEditing = !!initialData;
  const canWrite = isEditing ? can('cadastro:default:fonograma:editar') : can('cadastro:default:fonograma:criar');
  const isLiberadoOuDepurado = initialData?.status === 'Liberado' || initialData?.status === 'Depurado';

  const [isrc, setIsrc] = useState(initialData?.isrcFormatado || '');
  const [isrcError, setIsrcError] = useState('');
  
  const [obraId, setObraId] = useState(initialData?.obra?.id || initialObraId || '');
  const [obraTitulo, setObraTitulo] = useState(initialData?.obra?.titulo || initialObraTitulo || '');
  
  const [paisOrigem, setPaisOrigem] = useState(initialData?.paisOrigem || 'BR');
  const [dataGravacao, setDataGravacao] = useState(initialData?.dataGravacao || '');
  const [dataLancamento, setDataLancamento] = useState(initialData?.dataLancamento || '');
  const [urlAudio, setUrlAudio] = useState(initialData?.urlAudio || '');

  const validateIsrc = (value: string) => {
    if (!value) {
      setIsrcError('ISRC é obrigatório');
      return false;
    }
    if (!isValidIsrc(value)) {
      setIsrcError('Formato ISRC inválido. Padrão: CC-XXX-YY-NNNNN');
      return false;
    }
    setIsrcError('');
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateIsrc(isrc)) return;
    if (!obraId) {
      alert('Selecione uma Obra Musical.');
      return;
    }

    const payload = {
      isrc: isrc.replace(/-/g, ''),
      paisOrigem,
      dataGravacao: dataGravacao || undefined,
      dataLancamento: dataLancamento || undefined,
      urlAudio: urlAudio || undefined,
      ...(isEditing ? {} : { obraId }),
    };

    await onSubmit(payload);
  };

  return (
    <form className={styles.formContainer} onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        {/* ISRC */}
        <div className={styles.formGroup}>
          <label className={styles.label}>ISRC *</label>
          <input
            type="text"
            className={`${styles.input} ${styles.mono} ${isrcError ? styles.inputError : ''}`}
            placeholder="CC-XXX-YY-NNNNN"
            value={isrc}
            onChange={(e) => {
              setIsrc(e.target.value.toUpperCase());
              if (isrcError) setIsrcError('');
            }}
            onBlur={(e) => validateIsrc(e.target.value)}
            disabled={!canWrite || isLiberadoOuDepurado}
            required
          />
          {isrcError && <span className={styles.errorText}>{isrcError}</span>}
          {initialData?.status === 'Liberado' && (
            <span className={styles.helpText}>Alterar ISRC de fonograma liberado requer depuração.</span>
          )}
        </div>

        {/* Obra Musical */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Obra Musical *</label>
          {isEditing || initialObraId || !canWrite ? (
            <input
              type="text"
              className={styles.input}
              value={obraTitulo}
              disabled
              readOnly
            />
          ) : (
            <ObraSelect
              value={obraTitulo}
              onChange={(id, title) => {
                setObraId(id);
                setObraTitulo(title);
              }}
            />
          )}
        </div>

        {/* País Origem */}
        <div className={styles.formGroup}>
          <label className={styles.label}>País de Origem *</label>
          <input
            type="text"
            className={styles.input}
            placeholder="BR"
            value={paisOrigem}
            onChange={(e) => setPaisOrigem(e.target.value.toUpperCase())}
            disabled={!canWrite || initialData?.status === 'Depurado'}
            maxLength={2}
            required
          />
        </div>

        {/* Datas */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Data Gravação</label>
          <input
            type="date"
            className={styles.input}
            value={dataGravacao}
            onChange={(e) => setDataGravacao(e.target.value)}
            disabled={!canWrite || initialData?.status === 'Depurado'}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Data Lançamento</label>
          <input
            type="date"
            className={styles.input}
            value={dataLancamento}
            onChange={(e) => setDataLancamento(e.target.value)}
            disabled={!canWrite || initialData?.status === 'Depurado'}
          />
        </div>
        
        {/* URL Áudio */}
        <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
          <label className={styles.label}>URL do Áudio (Opcional)</label>
          <input
            type="url"
            className={styles.input}
            placeholder="https://storage.example.com/audio.mp3"
            value={urlAudio}
            onChange={(e) => setUrlAudio(e.target.value)}
            disabled={!canWrite || initialData?.status === 'Depurado' || (initialData?.status === 'Bloqueado' || initialData?.status?.toUpperCase() === 'BLOQUEADO')}
          />
        </div>
      </div>

      {canWrite && initialData?.status !== 'Depurado' && (
        <div className={styles.formActions}>
          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar Fonograma'}
          </button>
        </div>
      )}
    </form>
  );
}
