import { useState, useMemo, useEffect } from 'react';
import { Modal } from '@shared/components/ui/modal/Modal';
import { BuscaCadastroAutocomplete } from './BuscaCadastroAutocomplete';
import { useTiposUtilizacao } from '../hooks/useTiposUtilizacao';
import { useCreateExecucao } from '../hooks/useCreateExecucao';
import { useUpdateExecucao } from '../hooks/useUpdateExecucao';
import { Execucao, ObraFonogramaSelecionado } from '../types/execucao';
import type { Rubrica } from '../types/captacao';
import styles from './ExecucaoFormModal.module.css';

interface ExecucaoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  captacaoId: string;
  rubrica: Rubrica;
  initialData?: Execucao | null;
}

function formatDuracao(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  if (min === 0) return `${sec}s`;
  if (sec === 0) return `${min}min`;
  return `${min}min ${sec}s`;
}

export function ExecucaoFormModal({
  isOpen,
  onClose,
  captacaoId,
  rubrica,
  initialData,
}: ExecucaoFormModalProps) {
  const [cadastroSelecionado, setCadastroSelecionado] = useState<ObraFonogramaSelecionado | null>(null);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [tipoUtilizacaoId, setTipoUtilizacaoId] = useState('');
  const [tituloPrograma, setTituloPrograma] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: tiposUtilizacao } = useTiposUtilizacao();
  const createMutation = useCreateExecucao(captacaoId);
  const updateMutation = useUpdateExecucao(captacaoId);
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (initialData) {
      setCadastroSelecionado({
        obraId: initialData.obraId,
        fonogramaId: initialData.fonogramaId,
        titulo: initialData.obraTitulo, // simplified display
      });
      setInicio(initialData.inicio);
      setFim(initialData.fim);
      setQuantidade(initialData.quantidade);
      setTipoUtilizacaoId(initialData.tipoUtilizacao?.id || '');
      setTituloPrograma(initialData.tituloPrograma || '');
    } else {
      setCadastroSelecionado(null);
      setInicio('');
      setFim('');
      setQuantidade(1);
      setTipoUtilizacaoId('');
      setTituloPrograma('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const duracaoSegundos = useMemo(() => {
    if (!inicio || !fim) return 0;
    try {
      const partsInicio = inicio.split(':').map(Number);
      const partsFim = fim.split(':').map(Number);
      if (partsInicio.some(isNaN) || partsFim.some(isNaN)) return 0;
      
      let s1 = 0, m1 = 0, h1 = 0;
      let s2 = 0, m2 = 0, h2 = 0;

      if (partsInicio.length === 3) {
        [h1, m1, s1] = partsInicio;
      } else if (partsInicio.length === 2) {
        [h1, m1] = partsInicio;
      }
      
      if (partsFim.length === 3) {
        [h2, m2, s2] = partsFim;
      } else if (partsFim.length === 2) {
        [h2, m2] = partsFim;
      }

      const totalInicio = h1 * 3600 + m1 * 60 + s1;
      const totalFim = h2 * 3600 + m2 * 60 + s2;
      return totalFim > totalInicio ? totalFim - totalInicio : 0;
    } catch {
      return 0;
    }
  }, [inicio, fim]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!cadastroSelecionado) {
      newErrors.cadastro = 'Selecione ou crie uma obra/fonograma.';
    }
    if (!inicio || !inicio.includes(':')) newErrors.inicio = 'Início inválido.';
    if (!fim || !fim.includes(':')) newErrors.fim = 'Fim inválido.';
    if (duracaoSegundos === 0) newErrors.fim = 'O fim deve ser maior que o início.';
    if (quantidade < 1) newErrors.quantidade = 'A quantidade deve ser maior que 0.';

    if (rubrica.exigeClassificacao) {
      if (!tipoUtilizacaoId) newErrors.tipoUtilizacaoId = 'Selecione um tipo de utilização.';
      if (!tituloPrograma.trim()) newErrors.tituloPrograma = 'Informe o título do programa.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    
    // Convert time to standard format HH:mm:ss if user types HH:mm
    const normalizeTime = (t: string) => t.split(':').length === 2 ? `${t}:00` : t;

    const payload = {
      obraId: cadastroSelecionado!.obraId,
      fonogramaId: cadastroSelecionado!.fonogramaId,
      inicio: normalizeTime(inicio),
      fim: normalizeTime(fim),
      quantidade,
      tipoUtilizacaoId: rubrica.exigeClassificacao ? tipoUtilizacaoId : null,
      tituloPrograma: rubrica.exigeClassificacao ? tituloPrograma : null,
    };

    if (initialData) {
      updateMutation.mutate(
        { id: initialData.id, data: payload },
        {
          onSuccess: () => onClose(),
          onError: (err: any) => setErrors({ submit: err.detail || 'Erro ao atualizar execução.' }),
        }
      );
    } else {
      createMutation.mutate(
        payload,
        {
          onSuccess: () => onClose(),
          onError: (err: any) => setErrors({ submit: err.detail || 'Erro ao criar execução.' }),
        }
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Execução' : 'Adicionar Execução'}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.col}>
          <label className={styles.label}>
            Obra ou Fonograma <span className={styles.required}>*</span>
          </label>
          <BuscaCadastroAutocomplete
            value={cadastroSelecionado}
            onChange={setCadastroSelecionado}
            error={!!errors.cadastro}
          />
          {errors.cadastro && <span className={styles.errorText}>{errors.cadastro}</span>}
        </div>

        <div className={styles.row}>
          <div className={styles.col}>
            <label className={styles.label}>
              Horário Início <span className={styles.required}>*</span>
            </label>
            <input
              type="time"
              step="1"
              className={styles.input}
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              disabled={isPending}
            />
            {errors.inicio && <span className={styles.errorText}>{errors.inicio}</span>}
          </div>

          <div className={styles.col}>
            <label className={styles.label}>
              Horário Fim <span className={styles.required}>*</span>
              {duracaoSegundos > 0 && (
                <span className={styles.durationBadge}>Dur: {formatDuracao(duracaoSegundos)}</span>
              )}
            </label>
            <input
              type="time"
              step="1"
              className={styles.input}
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              disabled={isPending}
            />
            {errors.fim && <span className={styles.errorText}>{errors.fim}</span>}
          </div>

          <div className={styles.col}>
            <label className={styles.label}>
              Qtd <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              min="1"
              className={styles.input}
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
              disabled={isPending}
            />
            {errors.quantidade && <span className={styles.errorText}>{errors.quantidade}</span>}
          </div>
        </div>

        {rubrica.exigeClassificacao && (
          <div className={styles.conditionalBlock}>
            <div className={styles.col}>
              <label className={styles.label}>
                Tipo de Utilização <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={tipoUtilizacaoId}
                onChange={(e) => setTipoUtilizacaoId(e.target.value)}
                disabled={isPending}
              >
                <option value="">Selecione um tipo...</option>
                {tiposUtilizacao?.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.sigla} — {t.descricao}
                  </option>
                ))}
              </select>
              {errors.tipoUtilizacaoId && <span className={styles.errorText}>{errors.tipoUtilizacaoId}</span>}
            </div>

            <div className={styles.col}>
              <label className={styles.label}>
                Título do Programa <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ex: Novela das 9 - Cap. 142"
                value={tituloPrograma}
                onChange={(e) => setTituloPrograma(e.target.value)}
                disabled={isPending}
                maxLength={200}
              />
              {errors.tituloPrograma && <span className={styles.errorText}>{errors.tituloPrograma}</span>}
            </div>
          </div>
        )}

        {errors.submit && <span className={styles.errorText} style={{ fontSize: '0.875rem' }}>{errors.submit}</span>}

        <div className={styles.buttons}>
          <button type="button" onClick={onClose} className={styles.btnCancel} disabled={isPending}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnSubmit} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar Execução'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
