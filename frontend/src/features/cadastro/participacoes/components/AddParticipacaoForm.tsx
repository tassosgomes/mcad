import { useState } from 'react';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Select } from '@components/ui/select';
import { Autocomplete } from '@components/ui/autocomplete';
import { buscarTitulares } from '../api/participacoesApi';
import { useQuery } from '@tanstack/react-query';
import type { TitularResumo, CategoriaConexo, AdicionarParticipacaoRequest } from '../types/participacao';
import styles from './AddParticipacaoForm.module.css';

interface AddParticipacaoFormProps {
  onSubmit: (data: AdicionarParticipacaoRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CATEGORIA_OPTIONS = [
  { value: 'INTERPRETE' as CategoriaConexo, label: 'Intérprete' },
  { value: 'PRODUTOR_FONOGRAFICO' as CategoriaConexo, label: 'Produtor Fonográfico' },
  { value: 'MUSICO_EXECUTANTE' as CategoriaConexo, label: 'Músico Executante' },
];

export function AddParticipacaoForm({ onSubmit, onCancel, isSubmitting }: AddParticipacaoFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTitular, setSelectedTitular] = useState<TitularResumo | null>(null);
  const [categoria, setCategoria] = useState<CategoriaConexo | ''>('');

  const { data: resultados = [], isLoading } = useQuery({
    queryKey: ['titulares-busca', searchQuery],
    queryFn: () => buscarTitulares(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const canSubmit = selectedTitular !== null && categoria !== '';

  function handleSelectTitular(titular: TitularResumo) {
    setSelectedTitular(titular);
    setSearchQuery(titular.nome);
  }

  function handleSubmit() {
    if (!canSubmit || !selectedTitular || !categoria) return;
    onSubmit({ titularId: selectedTitular.id, categoria: categoria as CategoriaConexo });
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
          id="participacao-titular-search"
          renderItem={(t) => (
            <div className={styles.autocompleteItem}>
              <span className={styles.itemName}>{t.nome}</span>
              <div className={styles.itemMeta}>
                <Badge variant={t.tipo === 'PJ' ? 'accent' : 'secondary'}>{t.tipo}</Badge>
                <span className={styles.itemDoc}>{t.documentoFormatado}</span>
                {t.associacaoSigla && <span className={styles.itemAssoc}>{t.associacaoSigla}</span>}
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
            <Badge variant={selectedTitular.tipo === 'PJ' ? 'accent' : 'secondary'}>{selectedTitular.tipo}</Badge>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => { setSelectedTitular(null); setSearchQuery(''); setCategoria(''); }}
            >×</button>
          </div>

          <div className={styles.field}>
            <Select<CategoriaConexo>
              label="Categoria"
              id="participacao-categoria"
              value={categoria}
              onChange={setCategoria}
              options={CATEGORIA_OPTIONS}
              placeholder="Selecionar categoria..."
            />
          </div>

          <div className={styles.actions}>
            <Button variant="ghost" onClick={onCancel} type="button" disabled={isSubmitting}>Cancelar</Button>
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
          <Button variant="ghost" onClick={onCancel} type="button">Cancelar</Button>
        </div>
      )}
    </div>
  );
}
