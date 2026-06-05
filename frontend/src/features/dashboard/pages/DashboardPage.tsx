import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Search,
  Banknote,
  Split,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { useEffectiveProfile } from '@shared/auth/meApi';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import type {
  CadastroResumo,
  IdentificacaoResumo,
  ArrecadacaoResumo,
  DistribuicaoResumo,
  DashboardAlerta,
} from '../api/dashboardApi';
import styles from './DashboardPage.module.css';

const fmtNumber = new Intl.NumberFormat('pt-BR');
const fmtCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 2,
});
const fmtPercent = (v: number) => `${v.toFixed(1)}%`;

function AlertaBullet({ tipo }: { tipo: DashboardAlerta['tipo'] }) {
  const classMap: Record<string, string> = {
    info: styles.bulletInfo,
    warning: styles.bulletWarning,
    error: styles.bulletError ?? styles.bulletWarning,
  };
  return <span className={classMap[tipo] ?? styles.bulletInfo} aria-hidden="true" />;
}

function StatusBadge({ label, variant }: { label: string; variant: string }) {
  return <span className={`${styles.statusIndicator} ${styles[variant] ?? ''}`}>{label}</span>;
}

function WidgetSkeleton() {
  return (
    <div className={`${styles.widgetCard} ${styles.skeleton}`} data-testid="widget-skeleton">
      <div className={styles.skeletonBar} style={{ width: '60%', height: 20 }} />
      <div className={styles.metricsList}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.metricItem}>
            <div className={styles.skeletonBar} style={{ width: '70%', height: 24 }} />
            <div className={styles.skeletonBar} style={{ width: '90%', height: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CadastroWidget({ data }: { data: CadastroResumo }) {
  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetHeader}>
        <div className={styles.widgetTitleArea}>
          <div className={styles.widgetIconContainer}>
            <Database size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className={styles.widgetTitle}>Cadastro &amp; Catálogo</h2>
            <p className={styles.widgetSubtitle}>D01 — Obras, Fonogramas e Titulares</p>
          </div>
        </div>
        <StatusBadge label="Operacional" variant="success" />
      </div>

      <div className={styles.widgetContent}>
        <div className={styles.metricsList}>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{fmtNumber.format(data.totalObras)}</span>
            <span className={styles.metricLabel}>Obras Musicais</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{fmtNumber.format(data.totalFonogramas)}</span>
            <span className={styles.metricLabel}>Fonogramas</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{fmtNumber.format(data.totalTitulares)}</span>
            <span className={styles.metricLabel}>Titulares de Direito</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{fmtNumber.format(data.totalAssociacoes)}</span>
            <span className={styles.metricLabel}>Associações</span>
          </div>
        </div>

        <div className={styles.widgetFooter}>
          {data.alertas.length > 0 && (
            <div className={styles.widgetAlert}>
              <AlertaBullet tipo={data.alertas[0].tipo} />
              <span>{data.alertas[0].mensagem}</span>
            </div>
          )}
          <div className={styles.actionsGroup}>
            <Link to="/cadastro/associacoes" className={styles.actionBtn}>
              Associações <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link to="/cadastro/obras" className={styles.actionBtn}>
              Obras e Fonogramas <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdentificacaoWidget({ data }: { data: IdentificacaoResumo }) {
  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetHeader}>
        <div className={styles.widgetTitleArea}>
          <div className={styles.widgetIconContainer}>
            <Search size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className={styles.widgetTitle}>Identificação &amp; Match</h2>
            <p className={styles.widgetSubtitle}>D02 — Execução de Músicas</p>
          </div>
        </div>
        <StatusBadge label="Processando" variant="info" />
      </div>

      <div className={styles.widgetContent}>
        <div className={styles.metricsList}>
          <div className={styles.metricItem}>
            <span className={`${styles.metricValue} ${styles.accentText}`}>
              {fmtPercent(data.taxaMatch)}
            </span>
            <span className={styles.metricLabel}>Taxa de Match</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{fmtNumber.format(data.totalPendentes)}</span>
            <span className={styles.metricLabel}>Execuções Pendentes</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{fmtNumber.format(data.captacoesAtivas)}</span>
            <span className={styles.metricLabel}>Captações Ativas</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{data.ultimoLoteDescricao ?? '—'}</span>
            <span className={styles.metricLabel}>Último Lote (CSV)</span>
          </div>
        </div>

        <div className={styles.widgetFooter}>
          {data.alertas.length > 0 && (
            <div className={styles.widgetAlert}>
              <AlertaBullet tipo={data.alertas[0].tipo} />
              <span>{data.alertas[0].mensagem}</span>
            </div>
          )}
          <div className={styles.actionsGroup}>
            <Link to="/identificacao/captacoes" className={styles.actionBtn}>
              Captações <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link to="/identificacao/pendentes" className={styles.actionBtn}>
              Pendentes <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrecadacaoWidget({ data }: { data: ArrecadacaoResumo }) {
  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetHeader}>
        <div className={styles.widgetTitleArea}>
          <div className={styles.widgetIconContainer}>
            <Banknote size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className={styles.widgetTitle}>Arrecadação</h2>
            <p className={styles.widgetSubtitle}>D03 — Licenças e Cobranças</p>
          </div>
        </div>
        <StatusBadge
          label={data.totalLicencasSuspensas > 0 ? 'Ajustes' : 'Operacional'}
          variant={data.totalLicencasSuspensas > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className={styles.widgetContent}>
        <div className={styles.metricsList}>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{fmtCurrency.format(data.arrecadacaoMes)}</span>
            <span className={styles.metricLabel}>Arrecadado (Mês)</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>
              {fmtNumber.format(data.totalLicencasAtivas)}
            </span>
            <span className={styles.metricLabel}>Licenças Ativas</span>
          </div>
          <div className={styles.metricItem}>
            <span className={`${styles.metricValue} ${styles.warningText}`}>
              {fmtNumber.format(data.totalLicencasSuspensas)}
            </span>
            <span className={styles.metricLabel}>Licenças Suspensas</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>
              {fmtCurrency.format(data.verbaLiquidaEstimada)}
            </span>
            <span className={styles.metricLabel}>Verba Líquida Est.</span>
          </div>
        </div>

        <div className={styles.widgetFooter}>
          {data.alertas.length > 0 && (
            <div className={styles.widgetAlert}>
              <AlertaBullet tipo={data.alertas[0].tipo} />
              <span>{data.alertas[0].mensagem}</span>
            </div>
          )}
          <div className={styles.actionsGroup}>
            <Link to="/arrecadacao/licencas" className={styles.actionBtn}>
              Licenças <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link to="/arrecadacao/usuarios-musica" className={styles.actionBtn}>
              Usuários de Música <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DistribuicaoWidget({ data }: { data: DistribuicaoResumo }) {
  const isFinished = data.statusUltimoCiclo === 'FINALIZADO';
  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetHeader}>
        <div className={styles.widgetTitleArea}>
          <div className={styles.widgetIconContainer}>
            <Split size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className={styles.widgetTitle}>Distribuição</h2>
            <p className={styles.widgetSubtitle}>D04 — Repasses e Créditos</p>
          </div>
        </div>
        <StatusBadge
          label={isFinished ? 'Pronto' : data.statusUltimoCiclo}
          variant={isFinished ? 'success' : 'info'}
        />
      </div>

      <div className={styles.widgetContent}>
        <div className={styles.metricsList}>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>
              {isFinished ? 'Finalizado' : data.statusUltimoCiclo}
            </span>
            <span className={styles.metricLabel}>Último Ciclo</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{fmtCurrency.format(data.totalRepassado)}</span>
            <span className={styles.metricLabel}>Total Repassado</span>
          </div>
          <div className={styles.metricItem}>
            <span className={`${styles.metricValue} ${styles.errorText}`}>
              {fmtCurrency.format(data.creditosRetidos)}
            </span>
            <span className={styles.metricLabel}>Créditos Retidos</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{fmtNumber.format(data.rubricasAtivas)}</span>
            <span className={styles.metricLabel}>Rubricas Ativas</span>
          </div>
        </div>

        <div className={styles.widgetFooter}>
          {data.alertas.length > 0 && (
            <div className={styles.widgetAlert}>
              <AlertaBullet tipo={data.alertas[0].tipo} />
              <span>{data.alertas[0].mensagem}</span>
            </div>
          )}
          <div className={styles.actionsGroup}>
            <Link to="/distribuicao/processos" className={styles.actionBtn}>
              Processos <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link to="/distribuicao/rubricas" className={styles.actionBtn}>
              Rubricas <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const profileQuery = useEffectiveProfile();
  const profile = profileQuery.data;
  const userName = profile?.name ?? profile?.email ?? profile?.subjectId ?? 'Operador';
  const roleLabel = profile?.primaryRole ?? 'Perfil Efetivo';

  const { data, isLoading } = useDashboardSummary();

  const hasCadastro = data?.cadastro !== undefined;
  const hasIdentificacao = data?.identificacao !== undefined;
  const hasArrecadacao = data?.arrecadacao !== undefined;
  const hasDistribucao = data?.distribuicao !== undefined;
  const hasCopiloto = hasCadastro || hasIdentificacao || hasArrecadacao || hasDistribucao;
  const hasAnyWidget = hasCopiloto;

  useEffect(() => {
    document.title = 'Início — mini-ECAD';
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeText}>
          <h1 className={styles.welcomeTitle}>Olá, {userName}</h1>
          <p className={styles.welcomeSubtitle}>
            Bem-vindo ao console operacional do <strong>mini-ECAD</strong>. Perfil ativo:{' '}
            <Badge variant="secondary" mono>
              {roleLabel}
            </Badge>
          </p>
        </div>
      </div>

      {isLoading && (
        <div className={styles.grid}>
          <WidgetSkeleton />
          <WidgetSkeleton />
          <WidgetSkeleton />
          <WidgetSkeleton />
        </div>
      )}

      {!isLoading && !hasAnyWidget && (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            Nenhum domínio disponível para o seu perfil. Solicite permissões ao administrador.
          </p>
        </div>
      )}

      {!isLoading && hasAnyWidget && (
        <div className={styles.grid}>
          {data?.cadastro && <CadastroWidget data={data.cadastro} />}
          {data?.identificacao && <IdentificacaoWidget data={data.identificacao} />}
          {data?.arrecadacao && <ArrecadacaoWidget data={data.arrecadacao} />}
          {data?.distribuicao && <DistribuicaoWidget data={data.distribuicao} />}
        </div>
      )}

      {!isLoading && hasCopiloto && (
        <div className={styles.copilotSection}>
          <div className={styles.copilotCard}>
            <div className={styles.copilotContent}>
              <div className={styles.copilotIcon}>
                <Sparkles size={22} aria-hidden="true" />
              </div>
              <div className={styles.copilotBody}>
                <h3 className={styles.copilotTitle}>Copiloto Operacional (Mastra IA)</h3>
                <p className={styles.copilotDesc}>
                  Realize buscas complexas, investigue conciliações ou tire dúvidas sobre o catálogo operando
                  diretamente em linguagem natural. Nosso assistente interage de forma segura com as APIs de negócio.
                </p>
              </div>
            </div>
            <Link to="/copiloto" className={styles.copilotBtn}>
              Iniciar conversa <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
