import { useState } from 'react';
import { Button } from '@components/ui/button';
import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import type { SelectOption } from '@components/ui/select';
import { Badge } from '@components/ui/badge';
import type {
  FonogramaRepertorioInput,
  ParticipacaoRepertorioInput,
  TitularRepertorioInput,
  CategoriaConexoRepertorio,
} from '../index';
import type { TitularDisplayInfo } from './RepertorioWizard';
import styles from './FonogramasRepertorioStep.module.css';

const PAIS_OPCOES: SelectOption<string>[] = [
  { value: 'BR', label: 'Brasil' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CL', label: 'Chile' },
  { value: 'CO', label: 'Colômbia' },
  { value: 'MX', label: 'México' },
  { value: 'PE', label: 'Peru' },
  { value: 'PT', label: 'Portugal' },
  { value: 'ES', label: 'Espanha' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'UK', label: 'Reino Unido' },
  { value: 'FR', label: 'França' },
  { value: 'DE', label: 'Alemanha' },
  { value: 'IT', label: 'Itália' },
  { value: 'JP', label: 'Japão' },
  { value: 'OTHER', label: 'Outro' },
];

interface FonogramasRepertorioStepProps {
  fonogramas: FonogramaRepertorioInput[];
  titulares: TitularRepertorioInput[];
  displayMap: Record<string, TitularDisplayInfo>;
  errors: string[];
  onChange: (fonogramas: FonogramaRepertorioInput[]) => void;
}

function createEmptyFonograma(): FonogramaRepertorioInput {
  return {
    isrc: '',
    pais: 'BR',
    dataGravacao: null,
    dataLancamento: null,
    urlAudio: null,
    participacoes: [],
  };
}

export function FonogramasRepertorioStep({
  fonogramas,
  displayMap,
  errors,
  onChange,
}: FonogramasRepertorioStepProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const titularKeys = Object.keys(displayMap);

  function handleAddFonograma() {
    onChange([...fonogramas, createEmptyFonograma()]);
    setExpandedIndex(fonogramas.length);
  }

  function handleRemoveFonograma(index: number) {
    onChange(fonogramas.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
    else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  }

  function updateFonograma(index: number, updates: Partial<FonogramaRepertorioInput>) {
    onChange(
      fonogramas.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    );
  }

  function addParticipacao(fonogramaIndex: number, papel: CategoriaConexoRepertorio, titularLocalKey: string) {
    if (!titularLocalKey) return;
    const f = fonogramas[fonogramaIndex];
    if (!f) return;

    const alreadyExists = f.participacoes.some(
      (p) => p.titularLocalKey === titularLocalKey && p.papel === papel,
    );
    if (alreadyExists) return;

    const newPart: ParticipacaoRepertorioInput = { titularLocalKey, papel };
    updateFonograma(fonogramaIndex, {
      participacoes: [...f.participacoes, newPart],
    });
  }

  function removeParticipacao(fonogramaIndex: number, partIndex: number) {
    const f = fonogramas[fonogramaIndex];
    if (!f) return;
    updateFonograma(fonogramaIndex, {
      participacoes: f.participacoes.filter((_, i) => i !== partIndex),
    });
  }

  function getParticipacoesCount(f: FonogramaRepertorioInput, papel: CategoriaConexoRepertorio): number {
    return f.participacoes.filter((p) => p.papel === papel).length;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Fonogramas e Participações</h2>
        <Button variant="secondary" onClick={handleAddFonograma}>
          + Adicionar Fonograma
        </Button>
      </div>

      {errors.length > 0 && (
        <div className={styles.errorList}>
          {errors.map((e, i) => (
            <div key={i} className={styles.errorItem}>{e}</div>
          ))}
        </div>
      )}

      {fonogramas.length === 0 && (
        <p className={styles.emptyHint}>
          Nenhum fonograma adicionado. Clique em "Adicionar Fonograma" para começar.
        </p>
      )}

      {fonogramas.map((f, fi) => {
        const isExpanded = expandedIndex === fi;
        const nInterprete = getParticipacoesCount(f, 'INTERPRETE');
        const nProdutor = getParticipacoesCount(f, 'PRODUTOR_FONOGRAFICO');
        const nMusico = getParticipacoesCount(f, 'MUSICO_EXECUTANTE');

        return (
          <div key={fi} className={styles.fonogramaCard}>
            <div
              className={styles.fonogramaHeader}
              onClick={() => setExpandedIndex(isExpanded ? null : fi)}
            >
              <div className={styles.fonogramaTitle}>
                <span className={styles.fonogramaIndex}>#{fi + 1}</span>
                <span className={styles.fonogramaIsrc}>
                  {f.isrc || 'Sem ISRC'}
                </span>
              </div>
              <div className={styles.fonogramaBadges}>
                <Badge variant={nInterprete > 0 ? 'success' : 'warning'}>
                  Int: {nInterprete}
                </Badge>
                <Badge variant={nProdutor > 0 ? 'success' : 'warning'}>
                  Prod: {nProdutor}
                </Badge>
                <Badge variant="secondary">
                  Mús: {nMusico}
                </Badge>
              </div>
            </div>

            {isExpanded && (
              <div className={styles.fonogramaBody}>
                <div className={styles.fonogramaFields}>
                  <TextInput
                    label="ISRC"
                    value={f.isrc}
                    onChange={(v) => updateFonograma(fi, { isrc: v })}
                    placeholder="BR-XXX-00-00000"
                    mono
                    required
                  />
                  <Select<string>
                    label="País"
                    value={f.pais}
                    onChange={(v) => updateFonograma(fi, { pais: v })}
                    options={PAIS_OPCOES}
                  />
                  <TextInput
                    label="Data de Gravação"
                    value={f.dataGravacao ?? ''}
                    onChange={(v) => updateFonograma(fi, { dataGravacao: v || null })}
                    type="date"
                  />
                  <TextInput
                    label="Data de Lançamento"
                    value={f.dataLancamento ?? ''}
                    onChange={(v) => updateFonograma(fi, { dataLancamento: v || null })}
                    type="date"
                  />
                  <TextInput
                    label="URL de Áudio"
                    value={f.urlAudio ?? ''}
                    onChange={(v) => updateFonograma(fi, { urlAudio: v || null })}
                    placeholder="https://..."
                    type="url"
                  />
                </div>

                <div className={styles.participacoesSection}>
                  <h4 className={styles.participacoesTitle}>Participações</h4>

                  {titularKeys.length === 0 && (
                    <p className={styles.participacoesHint}>
                      Adicione titulares na etapa anterior para incluir participações.
                    </p>
                  )}

                  {f.participacoes.map((p, pi) => {
                    const info = displayMap[p.titularLocalKey];
                    return (
                      <div key={pi} className={styles.participacaoRow}>
                        <span className={styles.participacaoNome}>
                          {info?.nome ?? 'Titular'}
                        </span>
                        <Badge variant="secondary">{p.papel}</Badge>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeParticipacao(fi, pi)}
                        >
                          Remover
                        </Button>
                      </div>
                    );
                  })}

                  {titularKeys.length > 0 && (
                    <div className={styles.addParticipacaoRow}>
                      <select
                        className={styles.quickSelect}
                        aria-label="Adicionar Intérprete"
                        onChange={(e) => {
                          if (e.target.value) {
                            addParticipacao(
                              fi,
                              'INTERPRETE' as CategoriaConexoRepertorio,
                              e.target.value,
                            );
                            e.target.value = '';
                          }
                        }}
                        value=""
                      >
                        <option value="">+ Intérprete</option>
                        {titularKeys.map((k) => (
                          <option key={k} value={k}>
                            {displayMap[k]?.nome ?? k}
                          </option>
                        ))}
                      </select>
                      <select
                        className={styles.quickSelect}
                        aria-label="Adicionar Produtor Fonográfico"
                        onChange={(e) => {
                          if (e.target.value) {
                            addParticipacao(
                              fi,
                              'PRODUTOR_FONOGRAFICO' as CategoriaConexoRepertorio,
                              e.target.value,
                            );
                            e.target.value = '';
                          }
                        }}
                        value=""
                      >
                        <option value="">+ Produtor Fonográfico</option>
                        {titularKeys.map((k) => (
                          <option key={k} value={k}>
                            {displayMap[k]?.nome ?? k}
                          </option>
                        ))}
                      </select>
                      <select
                        className={styles.quickSelect}
                        aria-label="Adicionar Músico Executante"
                        onChange={(e) => {
                          if (e.target.value) {
                            addParticipacao(
                              fi,
                              'MUSICO_EXECUTANTE' as CategoriaConexoRepertorio,
                              e.target.value,
                            );
                            e.target.value = '';
                          }
                        }}
                        value=""
                      >
                        <option value="">+ Músico Executante</option>
                        {titularKeys.map((k) => (
                          <option key={k} value={k}>
                            {displayMap[k]?.nome ?? k}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className={styles.fonogramaActions}>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveFonograma(fi)}
                  >
                    Remover Fonograma
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
