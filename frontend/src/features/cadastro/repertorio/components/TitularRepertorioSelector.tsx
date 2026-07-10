import { useState } from 'react';
import { Button } from '@components/ui/button';
import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import type { SelectOption } from '@components/ui/select';
import { SomaIndicator } from '../../titularidades/components/SomaIndicator';
import { useBuscarTitularPorDocumento } from '../index';
import type {
  TitularRepertorioInput,
  TitularidadeRepertorioInput,
  NovoTitularRepertorioInput,
  TipoTitularRepertorio,
  CategoriaAutoralRepertorio,
  TitularResumoResponse,
} from '../index';
import type { TitularDisplayInfo } from './RepertorioWizard';
import styles from './TitularRepertorioSelector.module.css';

const CATEGORIA_OPCOES: SelectOption<CategoriaAutoralRepertorio>[] = [
  { value: 'AUTOR', label: 'Autor' },
  { value: 'EDITOR', label: 'Editor' },
];

const TIPO_PESSOA_OPCOES: SelectOption<TipoTitularRepertorio>[] = [
  { value: 'PF', label: 'Pessoa Física' },
  { value: 'PJ', label: 'Pessoa Jurídica' },
];

let nextLocalKey = 0;
function generateLocalKey(): string {
  nextLocalKey += 1;
  return `titular-${nextLocalKey}`;
}

interface TitularRepertorioSelectorProps {
  titulares: TitularRepertorioInput[];
  titularidades: TitularidadeRepertorioInput[];
  displayMap: Record<string, TitularDisplayInfo>;
  errors: string[];
  onDisplayMapChange: (map: Record<string, TitularDisplayInfo>) => void;
  onTitularesChange: (titulares: TitularRepertorioInput[]) => void;
  onTitularidadesChange: (titularidades: TitularidadeRepertorioInput[]) => void;
}

export function TitularRepertorioSelector({
  titulares,
  titularidades,
  displayMap,
  errors,
  onDisplayMapChange,
  onTitularesChange,
  onTitularidadesChange,
}: TitularRepertorioSelectorProps) {
  const [inputDocumento, setInputDocumento] = useState('');
  const [buscarDocumento, setBuscarDocumento] = useState('');
  const { data: titularBuscado, isLoading: buscando, isError: buscaErro } =
    useBuscarTitularPorDocumento(buscarDocumento);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newTipoPessoa, setNewTipoPessoa] = useState<TipoTitularRepertorio>('PF');
  const [newDocumento, setNewDocumento] = useState('');
  const [newNacionalidade, setNewNacionalidade] = useState('Brasil');
  const [newAssociacaoId, setNewAssociacaoId] = useState('');
  const [newCaeIpi, setNewCaeIpi] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const soma = titularidades.reduce((acc, t) => acc + t.percentual, 0);
  const somaCompleta = Math.abs(soma - 100) < 0.001;

  function handleSearch() {
    if (inputDocumento.trim().length === 0) return;
    setBuscarDocumento(inputDocumento.trim());
    setShowNewForm(false);
  }

  function handleUseTitular(resumo: TitularResumoResponse) {
    const localKey = generateLocalKey();
    const input: TitularRepertorioInput = { titularId: resumo.id, novoTitular: null };
    const info: TitularDisplayInfo = {
      nome: resumo.nome,
      tipoPessoa: resumo.tipo as TipoTitularRepertorio,
      documentoFormatado: resumo.documentoFormatado,
    };

    onTitularesChange([...titulares, input]);
    onDisplayMapChange({ ...displayMap, [localKey]: info });
    setBuscarDocumento('');
    setInputDocumento('');
  }

  function handleCreateNovoTitular() {
    const fieldErrors: Record<string, string> = {};
    if (!newNome.trim()) fieldErrors.nome = 'Nome é obrigatório';
    if (!newDocumento.trim()) fieldErrors.documento = 'Documento é obrigatório';
    if (!newNacionalidade.trim()) fieldErrors.nacionalidade = 'Nacionalidade é obrigatória';
    if (!newAssociacaoId.trim()) fieldErrors.associacaoId = 'Associação é obrigatória';

    if (Object.keys(fieldErrors).length > 0) {
      setFormErrors(fieldErrors);
      return;
    }

    const localKey = generateLocalKey();
    const novoTitular: NovoTitularRepertorioInput = {
      nome: newNome.trim(),
      tipoPessoa: newTipoPessoa,
      documento: newDocumento.trim(),
      nacionalidade: newNacionalidade.trim(),
      associacaoId: newAssociacaoId.trim(),
      caeIpi: newCaeIpi.trim() || null,
    };
    const input: TitularRepertorioInput = { titularId: null, novoTitular };
    const info: TitularDisplayInfo = {
      nome: newNome.trim(),
      tipoPessoa: newTipoPessoa,
    };

    onTitularesChange([...titulares, input]);
    onDisplayMapChange({ ...displayMap, [localKey]: info });
    setShowNewForm(false);
    setNewNome('');
    setNewDocumento('');
    setNewNacionalidade('Brasil');
    setNewAssociacaoId('');
    setNewCaeIpi('');
    setFormErrors({});
  }

  function handleRemoveTitular(index: number) {
    const localKey = getLocalKeyForIndex(index);
    onTitularesChange(titulares.filter((_, i) => i !== index));
    onTitularidadesChange(titularidades.filter((t) => t.titularLocalKey !== localKey));
    const nextMap = { ...displayMap };
    delete nextMap[localKey];
    onDisplayMapChange(nextMap);
  }

  function getLocalKeyForIndex(index: number): string {
    return Object.keys(displayMap)[index] ?? '';
  }

  function getDisplayInfo(index: number): TitularDisplayInfo | undefined {
    const key = getLocalKeyForIndex(index);
    return displayMap[key];
  }

  function setCategoria(localKeyIndex: number, categoria: CategoriaAutoralRepertorio, percentual: number) {
    const key = getLocalKeyForIndex(localKeyIndex);
    const existing = titularidades.find((t) => t.titularLocalKey === key);
    if (existing) {
      onTitularidadesChange(
        titularidades.map((t) =>
          t.titularLocalKey === key ? { ...t, categoria, percentual } : t,
        ),
      );
    } else {
      onTitularidadesChange([
        ...titularidades,
        { titularLocalKey: key, categoria, percentual },
      ]);
    }
  }

  function getTitularidadeForIndex(index: number): TitularidadeRepertorioInput | undefined {
    const key = getLocalKeyForIndex(index);
    return titularidades.find((t) => t.titularLocalKey === key);
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Titulares e Titularidades Autorais</h2>

      {errors.length > 0 && (
        <div className={styles.errorList}>
          {errors.map((e, i) => (
            <div key={i} className={styles.errorItem}>{e}</div>
          ))}
        </div>
      )}

      <SomaIndicator soma={soma} completa={somaCompleta} />

      <div className={styles.searchSection}>
        <h3 className={styles.sectionTitle}>Buscar Titular por CPF/CNPJ</h3>
        <div className={styles.searchRow}>
          <TextInput
            label="CPF/CNPJ"
            value={inputDocumento}
            onChange={setInputDocumento}
            placeholder="000.000.000-00 ou 00.000.000/0001-00"
            mono
          />
          <Button
            variant="secondary"
            onClick={handleSearch}
            disabled={buscando || inputDocumento.trim().length === 0}
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>

        {buscando && (
          <div className={styles.searchStatus}>Buscando titular...</div>
        )}

        {buscaErro && (
          <div className={styles.searchError}>Erro ao buscar titular</div>
        )}

        {!buscando && buscarDocumento.length > 0 && !buscaErro && titularBuscado && (
          <div className={styles.searchResult}>
            <div className={styles.searchResultInfo}>
              <span className={styles.searchResultName}>{titularBuscado.nome}</span>
              <span className={styles.searchResultMeta}>
                {titularBuscado.tipo} &middot; {titularBuscado.documentoFormatado}
                &middot; {titularBuscado.associacao}
              </span>
            </div>
            <Button variant="primary" size="sm" onClick={() => handleUseTitular(titularBuscado)}>
              Usar este titular
            </Button>
          </div>
        )}

        {!buscando && buscarDocumento.length > 0 && !buscaErro && titularBuscado === null && (
          <div className={styles.searchEmpty}>
            <p>Nenhum titular encontrado para este documento.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowNewForm(true)}
            >
              Cadastrar novo titular
            </Button>
          </div>
        )}
      </div>

      {showNewForm && (
        <div className={styles.newForm}>
          <h3 className={styles.sectionTitle}>Novo Titular</h3>
          <TextInput
            label="Nome"
            value={newNome}
            onChange={setNewNome}
            placeholder="Nome completo ou Razão Social"
            error={formErrors.nome}
            required
          />
          <Select<TipoTitularRepertorio>
            label="Tipo"
            value={newTipoPessoa}
            onChange={setNewTipoPessoa}
            options={TIPO_PESSOA_OPCOES}
          />
          <TextInput
            label="Documento"
            value={newDocumento}
            onChange={setNewDocumento}
            placeholder="CPF ou CNPJ"
            error={formErrors.documento}
            mono
            required
          />
          <TextInput
            label="Nacionalidade"
            value={newNacionalidade}
            onChange={setNewNacionalidade}
            placeholder="Nacionalidade"
            error={formErrors.nacionalidade}
            required
          />
          <TextInput
            label="Associação (ID)"
            value={newAssociacaoId}
            onChange={setNewAssociacaoId}
            placeholder="ID da associação"
            error={formErrors.associacaoId}
            required
          />
          <TextInput
            label="CAE/IPI"
            value={newCaeIpi}
            onChange={setNewCaeIpi}
            placeholder="CAE/IPI (opcional)"
          />
          <div className={styles.formActions}>
            <Button variant="primary" onClick={handleCreateNovoTitular}>
              Adicionar Titular
            </Button>
            <Button variant="ghost" onClick={() => setShowNewForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className={styles.titularesList}>
        <h3 className={styles.sectionTitle}>
          Titulares adicionados ({titulares.length})
        </h3>

        {titulares.length === 0 && (
          <p className={styles.emptyHint}>
            Nenhum titular adicionado. Busque um titular existente ou cadastre um novo.
          </p>
        )}

        {titulares.map((_, index) => {
          const info = getDisplayInfo(index);
          const tit = getTitularidadeForIndex(index);
          const key = getLocalKeyForIndex(index);

          return (
            <div key={key} className={styles.titularRow}>
              <div className={styles.titularInfo}>
                <span className={styles.titularNome}>
                  {info?.nome ?? 'Titular sem nome'}
                </span>
                <span className={styles.titularMeta}>
                  {info?.tipoPessoa}
                  {info?.documentoFormatado ? ` · ${info.documentoFormatado}` : ''}
                </span>
              </div>

              <div className={styles.titularFields}>
                <Select<CategoriaAutoralRepertorio>
                  label="Categoria"
                  value={tit?.categoria ?? ''}
                  onChange={(cat) =>
                    setCategoria(index, cat, tit?.percentual ?? 0)
                  }
                  options={CATEGORIA_OPCOES}
                  placeholder="Selecione"
                />
                <TextInput
                  label="Percentual (%)"
                  value={tit?.percentual?.toString() ?? ''}
                  onChange={(v) => {
                    const num = parseFloat(v);
                    if (isNaN(num)) return;
                    setCategoria(index, tit?.categoria ?? 'AUTOR', num);
                  }}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveTitular(index)}
                >
                  Remover
                </Button>
              </div>

              {tit?.categoria === 'EDITOR' && info?.tipoPessoa === 'PF' && (
                <div className={styles.validationWarning}>
                  Editor deve ser Pessoa Jurídica (PJ). Altere o tipo ou selecione um titular PJ.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
