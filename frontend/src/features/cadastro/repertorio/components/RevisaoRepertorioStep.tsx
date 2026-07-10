import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { SomaIndicator } from '../../titularidades/components/SomaIndicator';
import type { WizardState } from '../index';
import type { TitularDisplayInfo } from './RepertorioWizard';
import styles from './RevisaoRepertorioStep.module.css';

interface RevisaoRepertorioStepProps {
  state: WizardState;
  displayMap: Record<string, TitularDisplayInfo>;
  errors: string[];
  submitting: boolean;
  onConfirm: () => void;
}

export function RevisaoRepertorioStep({
  state,
  displayMap,
  errors,
  submitting,
  onConfirm,
}: RevisaoRepertorioStepProps) {
  const { obra, titulares, titularidades, fonogramas } = state;

  const soma = titularidades.reduce((acc, t) => acc + t.percentual, 0);
  const somaCompleta = Math.abs(soma - 100) < 0.001;

  const allValid =
    obra !== null &&
    somaCompleta &&
    fonogramas.length > 0 &&
    fonogramas.every((f) => {
      const hasInterprete = f.participacoes.some((p) => p.papel === 'INTERPRETE');
      const hasProdutor = f.participacoes.some((p) => p.papel === 'PRODUTOR_FONOGRAFICO');
      return f.isrc.trim() && f.urlAudio?.trim() && hasInterprete && hasProdutor;
    }) &&
    !titularidades.some((t) => {
      if (t.categoria === 'EDITOR') {
        const info = displayMap[t.titularLocalKey];
        return info?.tipoPessoa === 'PF';
      }
      return false;
    });

  const pendingIssues: string[] = [];
  if (!obra) pendingIssues.push('Obra não preenchida');
  else {
    if (!obra.titulo.trim()) pendingIssues.push('Título da obra não informado');
    if (!obra.tipo) pendingIssues.push('Tipo da obra não selecionado');
  }
  if (!somaCompleta) pendingIssues.push(`Total autoral em ${soma.toFixed(2)}% (precisa ser 100%)`);
  if (titularidades.length === 0) pendingIssues.push('Nenhuma titularidade autoral cadastrada');
  if (fonogramas.length === 0) pendingIssues.push('Nenhum fonograma cadastrado');
  fonogramas.forEach((f, i) => {
    if (!f.isrc.trim()) pendingIssues.push(`Fonograma ${i + 1}: ISRC vazio`);
    if (!f.urlAudio?.trim()) pendingIssues.push(`Fonograma ${i + 1}: URL de áudio vazia`);
    if (!f.participacoes.some((p) => p.papel === 'INTERPRETE'))
      pendingIssues.push(`Fonograma ${i + 1}: sem Intérprete`);
    if (!f.participacoes.some((p) => p.papel === 'PRODUTOR_FONOGRAFICO'))
      pendingIssues.push(`Fonograma ${i + 1}: sem Produtor Fonográfico`);
  });

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Revisão do Repertório</h2>

      {errors.length > 0 && (
        <div className={styles.errorList}>
          {errors.map((e, i) => (
            <div key={i} className={styles.errorItem}>{e}</div>
          ))}
        </div>
      )}

      {!allValid && pendingIssues.length > 0 && (
        <div className={styles.pendingBanner}>
          <h3 className={styles.pendingBannerTitle}>Pendências encontradas</h3>
          <ul className={styles.pendingList}>
            {pendingIssues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {allValid && (
        <div className={styles.readyBanner}>
          Repertório pronto para confirmação
        </div>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Dados da Obra</h3>
        {obra ? (
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Título</span>
              <span className={styles.detailValue}>{obra.titulo}</span>
            </div>
            {obra.subtitulo && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Subtítulo</span>
                <span className={styles.detailValue}>{obra.subtitulo}</span>
              </div>
            )}
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Tipo</span>
              <Badge variant="secondary">{obra.tipo}</Badge>
            </div>
            {obra.genero && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Gênero</span>
                <span className={styles.detailValue}>{obra.genero}</span>
              </div>
            )}
          </div>
        ) : (
          <p className={styles.emptyHint}>Obra não preenchida</p>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Titulares e Titularidades</h3>
        <SomaIndicator soma={soma} completa={somaCompleta} />

        {titulares.length === 0 && (
          <p className={styles.emptyHint}>Nenhum titular adicionado</p>
        )}

        {titulares.map((_, i) => {
          const key = Object.keys(displayMap)[i] ?? '';
          const info = displayMap[key];
          const tit = titularidades.find((t) => t.titularLocalKey === key);

          return (
            <div key={key} className={styles.revisaoRow}>
              <div className={styles.revisaoRowInfo}>
                <span className={styles.revisaoRowName}>{info?.nome ?? 'Titular'}</span>
                <span className={styles.revisaoRowMeta}>{info?.tipoPessoa}</span>
              </div>
              <div className={styles.revisaoRowData}>
                {tit ? (
                  <>
                    <Badge variant="secondary">{tit.categoria}</Badge>
                    <span className={styles.percentual}>{tit.percentual.toFixed(2)}%</span>
                  </>
                ) : (
                  <span className={styles.missingData}>Sem titularidade definida</span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Fonogramas ({fonogramas.length})</h3>

        {fonogramas.length === 0 && (
          <p className={styles.emptyHint}>Nenhum fonograma adicionado</p>
        )}

        {fonogramas.map((f, fi) => (
          <div key={fi} className={styles.fonogramaRev}>
            <div className={styles.fonogramaRevHeader}>
              <span className={styles.fonogramaRevIsrc}>{f.isrc || 'Sem ISRC'}</span>
              <span className={styles.fonogramaRevPais}>{f.pais}</span>
            </div>
            {f.urlAudio && (
              <div className={styles.fonogramaRevUrl}>
                URL: {f.urlAudio}
              </div>
            )}
            <div className={styles.fonogramaRevParticipacoes}>
              {f.participacoes.length === 0 && (
                <span className={styles.missingData}>Sem participações</span>
              )}
              {f.participacoes.map((p, pi) => {
                const info = displayMap[p.titularLocalKey];
                return (
                  <span key={pi} className={styles.partTag}>
                    {info?.nome ?? p.titularLocalKey} ({p.papel})
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <div className={styles.confirmSection}>
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={submitting || !allValid}
        >
          {submitting ? 'Enviando...' : 'Confirmar Cadastro do Repertório'}
        </Button>
      </div>
    </div>
  );
}
