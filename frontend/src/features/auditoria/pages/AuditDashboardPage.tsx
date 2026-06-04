import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, FileText, Monitor, ScrollText } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import styles from './AuditDashboard.module.css';

interface ActionCard {
  to: string;
  icon: typeof ScrollText;
  title: string;
  description: string;
}

const ACTIONS: ActionCard[] = [
  {
    to: '/auditoria/eventos',
    icon: ScrollText,
    title: 'Histórico de alterações',
    description: 'O que aconteceu com uma obra, titular, licença ou outra entidade — quem alterou, o que mudou e quando.',
  },
  {
    to: '/auditoria/acessos',
    icon: Monitor,
    title: 'Quem acessou o quê',
    description: 'Veja quais telas foram abertas por cada usuário num período. Útil para investigar acessos suspeitos.',
  },
  {
    to: '/auditoria/relatorios',
    icon: FileText,
    title: 'Relatórios em PDF',
    description: 'Gere um PDF com tudo que aconteceu no período. Use para arquivar, anexar a processos ou enviar a stakeholders.',
  },
];

interface Shortcut {
  to: string;
  label: string;
  hint: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    to: '/auditoria/acessos',
    label: 'Quem entrou em telas de Cadastro hoje',
    hint: 'Abre o filtro pronto: você só precisa escolher o usuário (ou deixar em branco para todos).',
  },
  {
    to: '/auditoria/eventos',
    label: 'Histórico de uma obra musical',
    hint: 'Cole o identificador da obra (Copiar ID na tela de Obras) e veja a cronologia completa.',
  },
  {
    to: '/auditoria/relatorios',
    label: 'PDF dos últimos 7 dias',
    hint: 'Padrão já configurado para "últimos 7 dias" — clique em Gerar relatório.',
  },
];

export function AuditDashboardPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        title="Auditoria"
        description="Tudo que acontece no mini-ECAD fica registrado aqui. Use as opções abaixo para investigar."
      />

      <section aria-label="Ações principais" className={styles.actionsGrid}>
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.to} to={action.to} className={styles.actionCard}>
              <div className={styles.actionIcon}>
                <Icon size={20} aria-hidden="true" />
              </div>
              <div className={styles.actionBody}>
                <h2 className={styles.actionTitle}>{action.title}</h2>
                <p className={styles.actionDescription}>{action.description}</p>
              </div>
              <ArrowRight size={18} className={styles.actionArrow} aria-hidden="true" />
            </Link>
          );
        })}
      </section>

      <section aria-label="Atalhos comuns" className={styles.shortcutsSection}>
        <h2 className={styles.sectionTitle}>
          <ClipboardList size={16} aria-hidden="true" /> Cenários frequentes
        </h2>
        <ul className={styles.shortcutsList}>
          {SHORTCUTS.map((shortcut) => (
            <li key={`${shortcut.to}-${shortcut.label}`} className={styles.shortcutItem}>
              <Link to={shortcut.to} className={styles.shortcutLink}>
                {shortcut.label}
              </Link>
              <p className={styles.shortcutHint}>{shortcut.hint}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Sobre a auditoria" className={styles.infoSection}>
        <h2 className={styles.sectionTitle}>Como funciona?</h2>
        <dl className={styles.infoList}>
          <div>
            <dt>O que é registrado?</dt>
            <dd>
              Toda alteração de dado (criação, edição, exclusão) e cada vez que um usuário abre uma tela
              dos módulos de Cadastro, Identificação, Arrecadação, Distribuição e Autorização.
            </dd>
          </div>
          <div>
            <dt>Quanto tempo fica guardado?</dt>
            <dd>
              Os eventos são preservados pelo serviço central de auditoria. A retenção segue a política
              definida pela administração — verifique com seu gestor o prazo aplicável.
            </dd>
          </div>
          <div>
            <dt>Quem pode consultar?</dt>
            <dd>
              Usuários com papel de auditoria ou administradores de cada módulo. Se você não vê algum
              item, fale com quem cuida dos seus acessos.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
