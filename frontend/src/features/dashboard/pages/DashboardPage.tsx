import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Search,
  Banknote,
  Split,
  Lock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { usePermissions } from '@shared/authz';
import { useEffectiveProfile } from '@shared/auth/meApi';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const { can } = usePermissions();
  const profileQuery = useEffectiveProfile();
  const profile = profileQuery.data;
  const userName = profile?.name ?? profile?.email ?? profile?.subjectId ?? 'Operador';
  const roleLabel = profile?.primaryRole ?? 'Perfil Efetivo';

  useEffect(() => {
    document.title = 'Início — mini-ECAD';
  }, []);

  // Determine permissions for each domain based on listing capabilities
  const hasCadastro = can('cadastro:default:associacao:listar');
  const hasIdentificacao = can('identificacao:default:captacao:listar');
  const hasArrecadacao = can('arrecadacao:default:cliente:listar');
  const hasDistribucao = can('distribuicao:default:rubrica:listar') || can('distribuicao:default:processo:listar');
  const hasCopiloto = hasCadastro || hasIdentificacao || hasArrecadacao || hasDistribucao;

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

      <div className={styles.grid}>
        {/* WIDGET 1: CADASTRO */}
        <div className={`${styles.widgetCard} ${!hasCadastro ? styles.locked : ''}`}>
          <div className={styles.widgetHeader}>
            <div className={styles.widgetTitleArea}>
              <div className={styles.widgetIconContainer}>
                <Database size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 className={styles.widgetTitle}>Cadastro & Catálogo</h2>
                <p className={styles.widgetSubtitle}>D01 — Obras, Fonogramas e Titulares</p>
              </div>
            </div>
            {hasCadastro ? (
              <span className={`${styles.statusIndicator} ${styles.success}`}>Operacional</span>
            ) : (
              <span className={`${styles.statusIndicator} ${styles.lockedText}`}>Restrito</span>
            )}
          </div>

          <div className={styles.widgetContent}>
            <div className={styles.metricsList}>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>84.200</span>
                <span className={styles.metricLabel}>Obras Musicais</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>67.150</span>
                <span className={styles.metricLabel}>Fonogramas</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>12.840</span>
                <span className={styles.metricLabel}>Titulares de Direito</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>7</span>
                <span className={styles.metricLabel}>Associações</span>
              </div>
            </div>

            {hasCadastro && (
              <div className={styles.widgetFooter}>
                <div className={styles.widgetAlert}>
                  <span className={styles.bulletSuccess} aria-hidden="true" />
                  <span>12 novos titulares aguardando revisão</span>
                </div>
                <div className={styles.actionsGroup}>
                  <Link to="/cadastro/associacoes" className={styles.actionBtn}>
                    Associações <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                  <Link to="/cadastro/obras" className={styles.actionBtn}>
                    Obras e Fonogramas <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {!hasCadastro && (
            <div className={styles.lockOverlay}>
              <Lock size={22} className={styles.lockIcon} aria-hidden="true" />
              <h3 className={styles.lockTitle}>Acesso Restrito</h3>
              <p className={styles.lockDesc}>
                Solicite permissão de visualização do domínio de Cadastro para ver os dados deste painel.
              </p>
              <span className={styles.requiredRole}>cadastro:default:associacao:listar</span>
            </div>
          )}
        </div>

        {/* WIDGET 2: IDENTIFICAÇÃO */}
        <div className={`${styles.widgetCard} ${!hasIdentificacao ? styles.locked : ''}`}>
          <div className={styles.widgetHeader}>
            <div className={styles.widgetTitleArea}>
              <div className={styles.widgetIconContainer}>
                <Search size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 className={styles.widgetTitle}>Identificação & Match</h2>
                <p className={styles.widgetSubtitle}>D02 — Execução de Músicas</p>
              </div>
            </div>
            {hasIdentificacao ? (
              <span className={`${styles.statusIndicator} ${styles.info}`}>Processando</span>
            ) : (
              <span className={`${styles.statusIndicator} ${styles.lockedText}`}>Restrito</span>
            )}
          </div>

          <div className={styles.widgetContent}>
            <div className={styles.metricsList}>
              <div className={styles.metricItem}>
                <span className={`${styles.metricValue} ${styles.accentText}`}>81.3%</span>
                <span className={styles.metricLabel}>Taxa de Match</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>142.508</span>
                <span className={styles.metricLabel}>Execuções Pendentes</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>18</span>
                <span className={styles.metricLabel}>Captações Ativas</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>4.2M</span>
                <span className={styles.metricLabel}>Último Lote (CSV)</span>
              </div>
            </div>

            {hasIdentificacao && (
              <div className={styles.widgetFooter}>
                <div className={styles.widgetAlert}>
                  <span className={styles.bulletInfo} aria-hidden="true" />
                  <span>Aguardando fechamento do ROL de Junho/2026</span>
                </div>
                <div className={styles.actionsGroup}>
                  <Link to="/identificacao/captacoes" className={styles.actionBtn}>
                    Captações <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                  <Link to="/identificacao/pendentes" className={styles.actionBtn}>
                    Pendentes <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {!hasIdentificacao && (
            <div className={styles.lockOverlay}>
              <Lock size={22} className={styles.lockIcon} aria-hidden="true" />
              <h3 className={styles.lockTitle}>Acesso Restrito</h3>
              <p className={styles.lockDesc}>
                Solicite permissão de visualização do domínio de Identificação para ver os dados deste painel.
              </p>
              <span className={styles.requiredRole}>identificacao:default:captacao:listar</span>
            </div>
          )}
        </div>

        {/* WIDGET 3: ARRECADAÇÃO */}
        <div className={`${styles.widgetCard} ${!hasArrecadacao ? styles.locked : ''}`}>
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
            {hasArrecadacao ? (
              <span className={`${styles.statusIndicator} ${styles.warning}`}>Ajustes</span>
            ) : (
              <span className={`${styles.statusIndicator} ${styles.lockedText}`}>Restrito</span>
            )}
          </div>

          <div className={styles.widgetContent}>
            <div className={styles.metricsList}>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>R$ 12.45M</span>
                <span className={styles.metricLabel}>Arrecadado (Mês)</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>1.842</span>
                <span className={styles.metricLabel}>Licenças Ativas</span>
              </div>
              <div className={styles.metricItem}>
                <span className={`${styles.metricValue} ${styles.warningText}`}>34</span>
                <span className={styles.metricLabel}>Licenças Suspensas</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>R$ 10.58M</span>
                <span className={styles.metricLabel}>Verba Líquida Est.</span>
              </div>
            </div>

            {hasArrecadacao && (
              <div className={styles.widgetFooter}>
                <div className={styles.widgetAlert}>
                  <span className={styles.bulletWarning} aria-hidden="true" />
                  <span>3 novas licenças ativadas hoje</span>
                </div>
                <div className={styles.actionsGroup}>
                  <Link to="/arrecadacao/licencas" className={styles.actionBtn}>
                    Licenças <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                  <Link to="/arrecadacao/usuarios-musica" className={styles.actionBtn}>
                    Usuários de Música <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {!hasArrecadacao && (
            <div className={styles.lockOverlay}>
              <Lock size={22} className={styles.lockIcon} aria-hidden="true" />
              <h3 className={styles.lockTitle}>Acesso Restrito</h3>
              <p className={styles.lockDesc}>
                Solicite permissão de visualização do domínio de Arrecadação para ver os dados deste painel.
              </p>
              <span className={styles.requiredRole}>arrecadacao:default:cliente:listar</span>
            </div>
          )}
        </div>

        {/* WIDGET 4: DISTRIBUIÇÃO */}
        <div className={`${styles.widgetCard} ${!hasDistribucao ? styles.locked : ''}`}>
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
            {hasDistribucao ? (
              <span className={`${styles.statusIndicator} ${styles.success}`}>Pronto</span>
            ) : (
              <span className={`${styles.statusIndicator} ${styles.lockedText}`}>Restrito</span>
            )}
          </div>

          <div className={styles.widgetContent}>
            <div className={styles.metricsList}>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>Finalizado</span>
                <span className={styles.metricLabel}>Último Ciclo</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>R$ 9.12M</span>
                <span className={styles.metricLabel}>Total Repassado</span>
              </div>
              <div className={styles.metricItem}>
                <span className={`${styles.metricValue} ${styles.errorText}`}>R$ 421K</span>
                <span className={styles.metricLabel}>Créditos Retidos</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>14</span>
                <span className={styles.metricLabel}>Rubricas Ativas</span>
              </div>
            </div>

            {hasDistribucao && (
              <div className={styles.widgetFooter}>
                <div className={styles.widgetAlert}>
                  <span className={styles.bulletSuccess} aria-hidden="true" />
                  <span>Próxima distribuição agendada para 20/06/2026</span>
                </div>
                <div className={styles.actionsGroup}>
                  <Link to="/distribuicao/processos" className={styles.actionBtn}>
                    Processos <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                  <Link to="/distribuicao/rubricas" className={styles.actionBtn}>
                    Rubricas <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {!hasDistribucao && (
            <div className={styles.lockOverlay}>
              <Lock size={22} className={styles.lockIcon} aria-hidden="true" />
              <h3 className={styles.lockTitle}>Acesso Restrito</h3>
              <p className={styles.lockDesc}>
                Solicite permissão de visualização do domínio de Distribuição para ver os dados deste painel.
              </p>
              <span className={styles.requiredRole}>distribuicao:default:processo:listar</span>
            </div>
          )}
        </div>
      </div>

      {hasCopiloto && (
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
