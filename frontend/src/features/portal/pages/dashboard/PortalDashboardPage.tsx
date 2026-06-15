import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { usePortalAuth } from '../../shared/auth/usePortalAuth';
import { useDashboard } from './useDashboard';
import styles from './PortalDashboardPage.module.css';

export function PortalDashboardPage() {
  const navigate = useNavigate();
  const { titular } = usePortalAuth();
  const { data, isLoading, error } = useDashboard();

  if (isLoading) return <Loading />;
  if (error) {
    return (
      <div className={styles.page}>
        <PageHeader title="Dashboard" description="Erro ao carregar dados do dashboard." />
        <div className={styles.errorState}>
          Não foi possível carregar os dados. Tente novamente mais tarde.
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: 'Minhas Obras',
      value: data?.minhasObras ?? '—',
      path: '/portal/repertorio',
      icon: '🎵',
    },
    {
      label: 'Meus Fonogramas',
      value: data?.meusFonogramas ?? '—',
      path: '/portal/repertorio',
      icon: '💿',
    },
    {
      label: 'Ocorrências Abertas',
      value: data?.ocorrenciasAbertas ?? '—',
      path: '/portal/ocorrencias',
      icon: '📋',
    },
    {
      label: 'Solicitações Pendentes',
      value: data?.solicitacoesPendentes ?? '—',
      path: '/portal/solicitacoes',
      icon: '📝',
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title={`Bem-vindo, ${titular?.nome ?? 'Titular'}`}
        description="Visão geral dos seus dados no sistema."
      />
      <div className={styles.cardGrid}>
        {cards.map((card) => (
          <button
            key={card.label}
            className={styles.card}
            onClick={() => navigate(card.path)}
            type="button"
            aria-label={`${card.label}: ${card.value}`}
          >
            <span className={styles.cardIcon} aria-hidden="true">{card.icon}</span>
            <span className={styles.cardValue}>{card.value}</span>
            <span className={styles.cardLabel}>{card.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.quickLinks}>
        <h2 className={styles.sectionTitle}>Acesso Rápido</h2>
        <div className={styles.linkList}>
          <button className={styles.quickLink} type="button" onClick={() => navigate('/portal/repertorio')}>
            Consultar Repertório
          </button>
          <button className={styles.quickLink} type="button" onClick={() => navigate('/portal/contato')}>
            Atualizar Dados de Contato
          </button>
          <button className={styles.quickLink} type="button" onClick={() => navigate('/portal/ocorrencias')}>
            Minhas Ocorrências
          </button>
          <button className={styles.quickLink} type="button" onClick={() => navigate('/portal/solicitacoes')}>
            Solicitações de Alteração
          </button>
        </div>
      </div>
    </div>
  );
}
