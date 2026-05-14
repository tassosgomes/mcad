import { useState } from 'react';
import { ArrowLeft, Edit, Play, PowerOff } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { ErrorState } from '@components/ui/error-state';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { usePermissions } from '@shared/authz';
import { AlterarStatusUsuarioMusicaModal } from '../components/AlterarStatusUsuarioMusicaModal';
import { HistoricoStatusUsuarioMusicaTimeline } from '../components/HistoricoStatusUsuarioMusicaTimeline';
import { StatusBadgeUsuarioMusica } from '../components/StatusBadgeUsuarioMusica';
import { useHistoricoStatusUsuarioMusica } from '../hooks/useHistoricoStatusUsuarioMusica';
import { useUsuarioMusica } from '../hooks/useUsuarioMusica';
import type { AcaoStatusUsuarioMusica } from '../hooks/useAlterarStatusUsuarioMusica';
import { formatCep, formatDateTime } from '../utils/formatters';
import styles from './UsuarioMusicaDetailPage.module.css';

export function UsuarioMusicaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const canWrite = can('arrecadacao:default:cliente:editar');
  const [modalAcao, setModalAcao] = useState<AcaoStatusUsuarioMusica | null>(null);
  const { data: usuario, isLoading, error, refetch } = useUsuarioMusica(id);
  const { data: historico = [] } = useHistoricoStatusUsuarioMusica(id);

  if (isLoading) return <Loading />;
  if (error || !usuario) {
    return <ErrorState message="Usuário de música não encontrado" onRetry={refetch} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/arrecadacao/usuarios-musica')}
          type="button"
          id="btn-back-detalhe-usuario-musica"
        >
          <ArrowLeft size={16} /> Usuários de Música
        </Button>
        <PageHeader
          title={usuario.razaoSocial}
          description={usuario.nomeFantasia || usuario.cnpjFormatado}
          action={
            canWrite ? (
              <Button
                variant="secondary"
                onClick={() => navigate(`/arrecadacao/usuarios-musica/${usuario.id}/editar`)}
                type="button"
                id="btn-editar-usuario-musica"
              >
                <Edit size={16} /> Editar
              </Button>
            ) : undefined
          }
        />
      </div>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Dados cadastrais</h2>
          <StatusBadgeUsuarioMusica status={usuario.status} />
        </div>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>CNPJ</span>
            <span className={styles.mono}>{usuario.cnpjFormatado}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Criado em</span>
            <span className={styles.mono}>{formatDateTime(usuario.criadoEm)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Atualizado em</span>
            <span className={styles.mono}>{formatDateTime(usuario.atualizadoEm)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Responsável</span>
            <span className={styles.fieldValue}>{usuario.contato.nomeResponsavel}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Telefone</span>
            <span className={styles.fieldValue}>{usuario.contato.telefone || 'Não informado'}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>E-mail</span>
            <span className={styles.fieldValue}>{usuario.contato.email || 'Não informado'}</span>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Endereço</h2>
        <div className={styles.address}>
          <span className={styles.fieldValue}>
            {usuario.endereco.logradouro}, {usuario.endereco.numero}
            {usuario.endereco.complemento ? ` - ${usuario.endereco.complemento}` : ''}
          </span>
          <span className={styles.fieldSub}>
            {usuario.endereco.bairro} - {usuario.endereco.cidade}/{usuario.endereco.uf}
          </span>
          <span className={styles.mono}>{formatCep(usuario.endereco.cep)}</span>
        </div>
      </section>

      {canWrite && (
        <section className={styles.actionCard}>
          <h2 className={styles.sectionTitle}>Ações de status</h2>
          <div className={styles.actions}>
            {usuario.status === 'ATIVO' ? (
              <Button
                variant="danger"
                onClick={() => setModalAcao('inativar')}
                type="button"
                id="btn-inativar-usuario-musica"
              >
                <PowerOff size={16} /> Inativar
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => setModalAcao('ativar')}
                type="button"
                id="btn-ativar-usuario-musica"
              >
                <Play size={16} /> Reativar
              </Button>
            )}
          </div>
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Histórico de status</h2>
        <HistoricoStatusUsuarioMusicaTimeline historico={historico} />
      </section>

      {modalAcao && (
        <AlterarStatusUsuarioMusicaModal
          acao={modalAcao}
          usuarioId={usuario.id}
          isOpen={!!modalAcao}
          onClose={() => setModalAcao(null)}
          onSuccess={() => {
            showToast(
              modalAcao === 'ativar'
                ? 'Usuário de música reativado com sucesso'
                : 'Usuário de música inativado com sucesso',
              'success',
            );
            setModalAcao(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
