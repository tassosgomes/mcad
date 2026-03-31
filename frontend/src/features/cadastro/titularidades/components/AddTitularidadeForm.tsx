import { useState } from 'react';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Select } from '@components/ui/select';
import { Autocomplete } from '@components/ui/autocomplete';
import { useBuscarTitulares } from '../hooks/useBuscarTitulares';
import type { TitularResumo, CategoriaAutoral, AdicionarTitularidadeRequest } from '../types/titularidade';
import styles from './AddTitularidadeForm.module.css';

interface AddTitularidadeFormProps {
  onSubmit: (data: AdicionarTitularidadeRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CATEGORIA_OPTIONS = [
  { value: 'AUTOR' as CategoriaAutoral, label: 'Autor / Compositor' },
  { value: 'EDITOR' as CategoriaAutoral, label: 'Editor' },
];

export function AddTitularidadeForm({ onSubmit, onCancel, isSubmitting }: AddTitularidadeFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTitular, setSelectedTitular] = useState<TitularResumo | null>(null);
  const [categoria, setCategoria] = useState<CategoriaAutoral | ''>('');
  const [percentual, setPercentual] = useState('');

  const { data: resultados = [], isLoading } = useBuscarTitulares(searchQuery);

  // Validação inline: Editor exige PJ (RF-03)
  const categoriaError =
    categoria === 'EDITOR' && selectedTitular?.tipo === 'PF'
      ? 'A categoria Editor exige titular Pessoa Jurídica'
      : undefined;

  const percentualNum = parseFloat(percentual);
  const percentualValid =
    percentual !== '' && !isNaN(percentualNum) && percentualNum > 0 && percentualNum <= 100;

  const canSubmit = selectedTitular !== null && categoria !== '' && percentualValid && !categoriaError;

  function handleSelectTitular(titular: TitularResumo) {
    setSelectedTitular(titular);
    setSearchQuery(titular.nome);
    // Reset categoria se PF selecionado e estava Editor
    if (titular.tipo === 'PF' && categoria === 'EDITOR') {
      setCategoria('');
    }
  }

  function handleSubmit() {
    if (!canSubmit || !selectedTitular || !categoria) return;
    onSubmit({
      titularId: selectedTitular.id,
      categoria: categoria as CategoriaAutoral,
      percentual: percentualNum,
    });
  }

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Buscar titular</label>
        <Autocomplete<TitularResumo>
          placeholder="Buscar por nome ou CPF/CNPJ..."
          value={searchQuery}
          onSearch={setSearchQuery}
          results={resultados}
          isLoading={isLoading}
          onSelect={handleSelectTitular}
          minChars={2}
          id="titular-search"
          renderItem={(t) => (
            <div className={styles.autocompleteItem}>
              <span className={styles.itemName}>{t.nome}</span>
              <div className={styles.itemMeta}>
                <Badge variant={t.tipo === 'PJ' ? 'accent' : 'secondary'}>
                  {t.tipo}
                </Badge>
                <span className={styles.itemDoc}>{t.documentoFormatado}</span>
                {t.associacaoSigla && (
                  <span className={styles.itemAssoc}>{t.associacaoSigla}</span>
                )}
              </div>
            </div>
          )}
        />
      </div>

      {selectedTitular && (
        <>
          <div className={styles.selectedInfo}>
            <span className={styles.selectedLabel}>Selecionado:</span>
            <span className={styles.selectedName}>{selectedTitular.nome}</span>
            <Badge variant={selectedTitular.tipo === 'PJ' ? 'accent' : 'secondary'}>
              {selectedTitular.tipo}
            </Badge>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setSelectedTitular(null);
                setSearchQuery('');
                setCategoria('');
              }}
            >
              ×
            </button>
          </div>

          <div className={styles.fieldsRow}>
            <div className={styles.fieldGroup}>
              <Select<CategoriaAutoral>
                label="Categoria"
                id="titularidade-categoria"
                value={categoria}
                onChange={setCategoria}
                options={CATEGORIA_OPTIONS}
                placeholder="Selecionar categoria..."
                error={categoriaError}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="titularidade-percentual">
                Percentual (%)
              </label>
              <input
                id="titularidade-percentual"
                type="number"
                className={styles.percentualInput}
                placeholder="0.0000"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
                min="0.0001"
                max="100"
                step="0.0001"
              />
              {percentual !== '' && !percentualValid && (
                <span className={styles.inputError}>Informe um valor entre 0.0001 e 100</span>
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="ghost" onClick={onCancel} type="button" disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              type="button"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </>
      )}

      {!selectedTitular && (
        <div className={styles.cancelRow}>
          <Button variant="ghost" onClick={onCancel} type="button">
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
