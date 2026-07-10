import { useReducer, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import type { SelectOption } from '@components/ui/select';
import {
  wizardReducer,
  wizardInitialState,
  useRegistrarRepertorio,
  useRegistrarRepertorioPendente,
} from '../index';
import type {
  WizardState,
  WizardStep,
  DadosObraRepertorio,
  TipoObraRepertorio,
  TipoTitularRepertorio,
  CadastroRepertorioResponse,
} from '../index';
import { buildRepertorioCommand } from '../types/repertorio';
import { TitularRepertorioSelector } from './TitularRepertorioSelector';
import { FonogramasRepertorioStep } from './FonogramasRepertorioStep';
import { RevisaoRepertorioStep } from './RevisaoRepertorioStep';
import styles from './RepertorioWizard.module.css';

const STEP_LABELS: Record<WizardStep, string> = {
  obra: 'Obra',
  titulares: 'Titulares',
  fonogramas: 'Fonogramas',
  revisao: 'Revisão',
};

const STEP_ORDER: WizardStep[] = ['obra', 'titulares', 'fonogramas', 'revisao'];

const TIPO_OPCOES: SelectOption<TipoObraRepertorio>[] = [
  { value: 'MUSICAL', label: 'Musical' },
  { value: 'LITEROMUSICAL', label: 'Literomusical' },
  { value: 'VERSAO', label: 'Versão' },
  { value: 'POT_POURRI', label: 'Pot-pourri' },
];

const GENERO_OPCOES: SelectOption<string>[] = [
  { value: '', label: '—' },
  { value: 'Samba', label: 'Samba' },
  { value: 'Bossa Nova', label: 'Bossa Nova' },
  { value: 'MPB', label: 'MPB' },
  { value: 'Forró', label: 'Forró' },
  { value: 'Sertanejo', label: 'Sertanejo' },
  { value: 'Funk', label: 'Funk' },
  { value: 'Rock', label: 'Rock' },
  { value: 'Pop', label: 'Pop' },
  { value: 'Reggae', label: 'Reggae' },
  { value: 'Eletrônica', label: 'Eletrônica' },
  { value: 'Gospel', label: 'Gospel' },
  { value: 'Infantil', label: 'Infantil' },
  { value: 'Instrumental', label: 'Instrumental' },
  { value: 'Clássica', label: 'Clássica' },
  { value: 'Jazz', label: 'Jazz' },
  { value: 'Pagode', label: 'Pagode' },
  { value: 'Axé', label: 'Axé' },
  { value: 'Brega', label: 'Brega' },
  { value: 'Outro', label: 'Outro' },
];

export interface TitularDisplayInfo {
  nome: string;
  tipoPessoa: TipoTitularRepertorio;
  documentoFormatado?: string;
}

function validateStep1(state: WizardState): string[] {
  const errs: string[] = [];
  if (!state.obra || !state.obra.titulo.trim()) {
    errs.push('Título da obra é obrigatório');
  }
  if (!state.obra || !state.obra.tipo) {
    errs.push('Tipo da obra é obrigatório');
  }
  return errs;
}

function validateStep2(state: WizardState, displayMap: Record<string, TitularDisplayInfo>): string[] {
  const errs: string[] = [];
  if (state.titularidades.length === 0) {
    errs.push('Adicione ao menos uma titularidade autoral');
    return errs;
  }
  const total = state.titularidades.reduce((acc, t) => acc + t.percentual, 0);
  if (Math.abs(total - 100) > 0.001) {
    errs.push(`Soma dos percentuais autorais deve ser 100% (atual: ${total.toFixed(2)}%)`);
  }
  for (const tit of state.titularidades) {
    if (tit.categoria === 'EDITOR') {
      const info = displayMap[tit.titularLocalKey];
      if (info && info.tipoPessoa === 'PF') {
        errs.push('Editor deve ser Pessoa Jurídica (PJ)');
        break;
      }
    }
  }
  return errs;
}

function validateStep3(state: WizardState): string[] {
  const errs: string[] = [];
  if (state.fonogramas.length === 0) {
    errs.push('Adicione ao menos um fonograma');
    return errs;
  }
  for (let i = 0; i < state.fonogramas.length; i++) {
    const f = state.fonogramas[i];
    if (!f.isrc.trim()) {
      errs.push(`Fonograma ${i + 1}: ISRC é obrigatório`);
    }
    if (!f.urlAudio?.trim()) {
      errs.push(`Fonograma ${i + 1}: URL de áudio é obrigatória`);
    }
    const hasInterprete = f.participacoes.some((p) => p.papel === 'INTERPRETE');
    const hasProdutor = f.participacoes.some((p) => p.papel === 'PRODUTOR_FONOGRAFICO');
    if (!hasInterprete) {
      errs.push(`Fonograma ${i + 1}: é necessário ao menos um Intérprete`);
    }
    if (!hasProdutor) {
      errs.push(`Fonograma ${i + 1}: é necessário ao menos um Produtor Fonográfico`);
    }
  }
  return errs;
}

export function RepertorioWizard() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(wizardReducer, undefined, wizardInitialState);
  const [displayMap, setDisplayMap] = useState<Record<string, TitularDisplayInfo>>({});
  const [stepErrors, setStepErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const registerMutation = useRegistrarRepertorio({
    onIswcIndisponivel: () => {
      dispatch({ type: 'SET_ISWC_FALHOU', falhou: true });
      setSubmitting(false);
    },
    onSuccess: (data: CadastroRepertorioResponse) => {
      dispatch({ type: 'SET_RESULTADO', resultado: data });
      dispatch({ type: 'SET_STEP', step: 'revisao' });
      setSubmitting(false);
    },
    onError: () => {
      setSubmitting(false);
    },
  });

  const pendenteMutation = useRegistrarRepertorioPendente({
    onSuccess: (data: CadastroRepertorioResponse) => {
      dispatch({ type: 'SET_RESULTADO', resultado: data });
      dispatch({ type: 'SET_STEP', step: 'revisao' });
      setSubmitting(false);
    },
    onError: () => {
      setSubmitting(false);
    },
  });

  const isPendenteMode = state.iswcFalhou;

  const getStepStatus = useCallback(
    (step: WizardStep): 'current' | 'complete' | 'pending' => {
      const idx = STEP_ORDER.indexOf(state.step);
      const stepIdx = STEP_ORDER.indexOf(step);
      if (stepIdx < idx) return 'complete';
      if (stepIdx === idx) return 'current';
      return 'pending';
    },
    [state.step],
  );

  function handleNext() {
    const errs: string[] = [];
    switch (state.step) {
      case 'obra':
        errs.push(...validateStep1(state));
        break;
      case 'titulares':
        errs.push(...validateStep2(state, displayMap));
        break;
      case 'fonogramas':
        errs.push(...validateStep3(state));
        break;
      case 'revisao':
        break;
    }

    if (errs.length > 0) {
      setStepErrors((prev) => ({ ...prev, [state.step]: errs }));
      return;
    }

    setStepErrors((prev) => {
      const next = { ...prev };
      delete next[state.step];
      return next;
    });

    const currentIdx = STEP_ORDER.indexOf(state.step);
    if (currentIdx < STEP_ORDER.length - 1) {
      dispatch({ type: 'SET_STEP', step: STEP_ORDER[currentIdx + 1] });
    }
  }

  function handleBack() {
    const currentIdx = STEP_ORDER.indexOf(state.step);
    if (currentIdx > 0) {
      dispatch({ type: 'SET_STEP', step: STEP_ORDER[currentIdx - 1] });
      dispatch({ type: 'SET_ISWC_FALHOU', falhou: false });
    }
  }

  function handleConfirm() {
    const errs: string[] = [
      ...validateStep1(state),
      ...validateStep2(state, displayMap),
      ...validateStep3(state),
    ];

    if (errs.length > 0) {
      setStepErrors({ revisao: errs });
      return;
    }

    setStepErrors({});
    setSubmitting(true);
    const cmd = buildRepertorioCommand(state);
    if (!cmd) return;

    if (isPendenteMode) {
      pendenteMutation.mutate(cmd);
    } else {
      registerMutation.mutate(cmd);
    }
  }

  function handleRetry() {
    setSubmitting(true);
    const cmd = buildRepertorioCommand(state);
    if (!cmd) return;
    registerMutation.mutate(cmd);
  }

  function handleSavePendente() {
    setSubmitting(true);
    const cmd = buildRepertorioCommand(state);
    if (!cmd) return;
    pendenteMutation.mutate(cmd);
  }

  function handleShowDetail(obraId: string) {
    navigate(`/cadastro/obras/${obraId}`);
  }

  function handleReset() {
    dispatch({ type: 'RESET' });
    setDisplayMap({});
    setStepErrors({});
    setSubmitting(false);
  }

  if (state.resultado) {
    const r = state.resultado;
    return (
      <div className={styles.result}>
        <h2 className={styles.resultTitle}>
          {r.iswcObtido ? 'Repertório cadastrado com sucesso' : 'Obra salva como PENDENTE'}
        </h2>

        {!r.iswcObtido && (
          <div className={styles.pendenteNotice}>
            Obra salva sem ISWC — solicite o ISWC posteriormente na tela de detalhes da obra.
          </div>
        )}

        <div className={styles.resultGrid}>
          <div className={styles.resultItem}>
            <span className={styles.resultLabel}>Obra</span>
            <span className={styles.resultValue}>{r.obraTitulo}</span>
            <button
              className={styles.resultLink}
              onClick={() => handleShowDetail(r.obraId)}
              type="button"
            >
              Ver detalhes ({r.obraId.slice(0, 8)}...)
            </button>
          </div>
          {r.iswc && (
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>ISWC</span>
              <span className={styles.resultValue}>{r.iswc}</span>
            </div>
          )}
          <div className={styles.resultItem}>
            <span className={styles.resultLabel}>Status</span>
            <Badge variant={r.iswcObtido ? 'success' : 'warning'}>
              {r.statusObra}
            </Badge>
          </div>
          <div className={styles.resultItem}>
            <span className={styles.resultLabel}>Fonogramas</span>
            <span className={styles.resultValue}>{r.fonogramas.length}</span>
          </div>
        </div>

        <div className={styles.resultActions}>
          <Button variant="primary" onClick={handleReset}>
            Novo Repertório
          </Button>
          <Button variant="ghost" onClick={() => handleShowDetail(r.obraId)}>
            Ir para Obra
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wizard}>
      <div className={styles.stepIndicator}>
        {STEP_ORDER.map((step) => {
          const status = getStepStatus(step);
          const stepErrs = stepErrors[step];
          return (
            <div
              key={step}
              className={[
                styles.stepDot,
                styles[status],
                stepErrs && stepErrs.length > 0 ? styles.hasErrors : '',
              ].join(' ')}
            >
              <span className={styles.stepLabel}>{STEP_LABELS[step]}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.stepBody}>
        {state.step === 'obra' && (
          <ObraStep
            obra={state.obra}
            errors={stepErrors.obra ?? []}
            onChange={(obra) => dispatch({ type: 'SET_OBRA', obra })}
          />
        )}

        {state.step === 'titulares' && (
          <TitularRepertorioSelector
            titulares={state.titulares}
            titularidades={state.titularidades}
            displayMap={displayMap}
            errors={stepErrors.titulares ?? []}
            onDisplayMapChange={setDisplayMap}
            onTitularesChange={(titulares) =>
              dispatch({ type: 'SET_TITULARES', titulares })
            }
            onTitularidadesChange={(titularidades) =>
              dispatch({ type: 'SET_TITULARIDADES', titularidades })
            }
          />
        )}

        {state.step === 'fonogramas' && (
          <FonogramasRepertorioStep
            fonogramas={state.fonogramas}
            titulares={state.titulares}
            displayMap={displayMap}
            errors={stepErrors.fonogramas ?? []}
            onChange={(fonogramas) =>
              dispatch({ type: 'SET_FONOGRAMAS', fonogramas })
            }
          />
        )}

        {state.step === 'revisao' && (
          <div>
            {isPendenteMode && (
              <div className={styles.iswcFailureBanner}>
                <h3>ISWC indisponível</h3>
                <p>
                  Não foi possível obter o ISWC. Escolha Tentar novamente ou Salvar como pendente.
                </p>
                <div className={styles.iswcActions}>
                  <Button
                    variant="primary"
                    onClick={handleRetry}
                    disabled={submitting}
                  >
                    {submitting ? 'Enviando...' : 'Tentar novamente'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleSavePendente}
                    disabled={submitting}
                  >
                    Salvar como pendente
                  </Button>
                </div>
              </div>
            )}

            {!isPendenteMode && (
              <RevisaoRepertorioStep
                state={state}
                displayMap={displayMap}
                errors={stepErrors.revisao ?? []}
                submitting={submitting}
                onConfirm={handleConfirm}
              />
            )}
          </div>
        )}
      </div>

      {!isPendenteMode && state.step !== 'revisao' && (
        <div className={styles.navButtons}>
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={state.step === 'obra'}
          >
            Voltar
          </Button>
          <Button variant="primary" onClick={handleNext}>
            {state.step === 'fonogramas' ? 'Revisar' : 'Próximo'}
          </Button>
        </div>
      )}

      {(isPendenteMode || submitting) && (
        <div className={styles.navButtons}>
          <Button variant="ghost" onClick={handleBack}>
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
}

interface ObraStepProps {
  obra: DadosObraRepertorio | null;
  errors: string[];
  onChange: (obra: DadosObraRepertorio) => void;
}

function ObraStep({ obra, errors, onChange }: ObraStepProps) {
  const titulo = obra?.titulo ?? '';
  const subtitulo = obra?.subtitulo ?? '';
  const tipo = obra?.tipo ?? ('MUSICAL' as TipoObraRepertorio);
  const genero = obra?.genero ?? '';

  function emit(overrides: Partial<DadosObraRepertorio>) {
    onChange({
      titulo,
      subtitulo,
      tipo,
      genero,
      ...overrides,
    });
  }

  return (
    <div className={styles.obraStep}>
      <h2 className={styles.stepTitle}>Dados da Obra</h2>

      {errors.length > 0 && (
        <div className={styles.errorList}>
          {errors.map((e, i) => (
            <div key={i} className={styles.errorItem}>{e}</div>
          ))}
        </div>
      )}

      <TextInput
        label="Título"
        value={titulo}
        onChange={(v) => emit({ titulo: v })}
        placeholder="Título da obra"
        required
      />

      <TextInput
        label="Subtítulo"
        value={subtitulo}
        onChange={(v) => emit({ subtitulo: v ?? null })}
        placeholder="Subtítulo (opcional)"
      />

      <Select<TipoObraRepertorio>
        label="Tipo"
        value={tipo}
        onChange={(v) => emit({ tipo: v })}
        options={TIPO_OPCOES}
        placeholder="Selecione o tipo"
      />

      <Select<string>
        label="Gênero"
        value={genero}
        onChange={(v) => emit({ genero: v || null })}
        options={GENERO_OPCOES}
        placeholder="Selecione o gênero"
      />
    </div>
  );
}
