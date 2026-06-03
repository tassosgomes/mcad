import { useMemo, useState } from 'react';
import { AlertTriangle, Search, Trash2, UserPlus } from 'lucide-react';
import { Autocomplete } from '@components/ui/autocomplete';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { Modal } from '@components/ui/modal';
import { Can } from '@shared/authz';
import {
  filterAssignmentsByRole,
  useAssignments,
  useAtribuirPapel,
  useRemoverPapel,
  useUsuarios,
  type AcessoUsuario,
  type RoleAssignmentRow,
} from '@features/autorizacao/api/acessosApi';
import styles from '../pages/RolesPage.module.css';

const ASSIGNMENTS_PAGE_SIZE = 200;

interface RoleUsersTabProps {
  roleKey: string;
  roleDisplayName: string;
  isInactive: boolean;
}

function getUserPrimary(row: RoleAssignmentRow): string {
  return row.assignment.name || row.assignment.email || row.assignment.subject;
}

function getUserSecondary(row: RoleAssignmentRow): string | undefined {
  if (row.assignment.email && row.assignment.email !== getUserPrimary(row)) {
    return row.assignment.email;
  }
  return undefined;
}

function getUserLabel(user: AcessoUsuario): string {
  return user.name || user.email || user.subject;
}

export function RoleUsersTab({ roleKey, roleDisplayName, isInactive }: RoleUsersTabProps) {
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AcessoUsuario | null>(null);
  const [filter, setFilter] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<RoleAssignmentRow | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const assignmentsQuery = useAssignments({ page: 0, size: ASSIGNMENTS_PAGE_SIZE });
  const usuariosQuery = useUsuarios(
    { page: 0, size: 10, query: userSearch },
    userSearch.trim().length >= 2,
  );
  const atribuirPapel = useAtribuirPapel();
  const removerPapel = useRemoverPapel();

  const rows = useMemo(
    () => filterAssignmentsByRole(assignmentsQuery.data?.items ?? [], roleKey),
    [assignmentsQuery.data, roleKey],
  );
  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const haystack = `${getUserPrimary(row)} ${row.assignment.email ?? ''} ${row.assignment.subject}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [rows, filter]);
  const assignedUserIds = useMemo(() => new Set(rows.map((row) => row.assignment.userId ?? row.assignment.subject)), [rows]);

  const handleAssign = async () => {
    if (!selectedUser) return;
    setFeedback(null);
    try {
      await atribuirPapel.mutateAsync({ userId: selectedUser.id, roleKey });
      setSelectedUser(null);
      setUserSearch('');
      setFeedback({
        tone: 'success',
        message: `${getUserLabel(selectedUser)} recebeu o papel. A propagação das permissões pode levar até 5 minutos.`,
      });
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível atribuir o papel.' });
    }
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    setFeedback(null);
    try {
      await removerPapel.mutateAsync({ assignmentId: pendingRemoval.role.assignmentId ?? '' });
      setPendingRemoval(null);
      setFeedback({
        tone: 'success',
        message: 'Papel removido. A revogação pode levar até 5 minutos para refletir em todos os caches.',
      });
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível remover o papel deste usuário.' });
    }
  };

  return (
    <section className={styles.permissionPicker} aria-label="Usuários do papel">
      <div className={styles.pickerHeader}>
        <div>
          <h3 className={styles.panelTitle}>Usuários com este papel</h3>
          <p className={styles.panelDescription}>
            {rows.length === 0
              ? 'Nenhum usuário ainda tem este papel.'
              : `${rows.length} ${rows.length === 1 ? 'usuário possui' : 'usuários possuem'} este papel.`}
          </p>
        </div>
        <span className={styles.counter}>{rows.length} total</span>
      </div>

      {feedback && (
        <div className={feedback.tone === 'success' ? styles.success : styles.error} role="status" aria-live="polite">
          {feedback.message}
        </div>
      )}

      <Can permission="acessos:default:papel:atribuir">
        <div className={styles.addUser}>
          <label className={styles.label} htmlFor={`role-add-user-${roleKey}`}>Adicionar usuário</label>
          <Autocomplete
            id={`role-add-user-${roleKey}`}
            placeholder="Buscar por nome, email ou identificador"
            value={userSearch}
            onSearch={(value) => {
              setUserSearch(value);
              setSelectedUser(null);
            }}
            results={(usuariosQuery.data?.items ?? []).filter((user) => !assignedUserIds.has(user.id))}
            isLoading={usuariosQuery.isFetching}
            onSelect={(user) => {
              setSelectedUser(user);
              setUserSearch(getUserLabel(user));
            }}
            renderItem={(user) => (
              <span>
                <strong>{getUserLabel(user)}</strong>
                <br />
                <span className={styles.secondaryText}>{user.email ?? user.subject}</span>
              </span>
            )}
            disabled={isInactive}
          />
          <div className={styles.actions}>
            <Button
              type="button"
              onClick={() => void handleAssign()}
              disabled={!selectedUser || atribuirPapel.isPending || isInactive}
            >
              <UserPlus size={16} />
              {atribuirPapel.isPending ? 'Atribuindo...' : 'Atribuir papel'}
            </Button>
            {isInactive && (
              <span className={styles.addUserHint}>Papel inativo: ative-o antes de atribuir novos usuários.</span>
            )}
          </div>
        </div>
      </Can>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`role-users-filter-${roleKey}`}>Filtrar usuários atuais</label>
        <div className={styles.searchField}>
          <Search size={16} />
          <input
            id={`role-users-filter-${roleKey}`}
            className={styles.input}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Nome, email ou identificador"
          />
        </div>
      </div>

      {assignmentsQuery.isLoading && <Loading />}
      {assignmentsQuery.isError && (
        <div className={styles.error}>Não foi possível carregar os usuários deste papel.</div>
      )}
      {!assignmentsQuery.isLoading && filtered.length === 0 && (
        <div className={styles.empty}>
          {rows.length === 0
            ? 'Nenhum usuário possui este papel ainda. Use o campo acima para atribuir.'
            : 'Nenhum usuário corresponde ao filtro.'}
        </div>
      )}
      {filtered.length > 0 && (
        <div className={styles.userList}>
          {filtered.map((row) => {
            const secondary = getUserSecondary(row);
            return (
              <div className={styles.userLine} key={row.role.assignmentId ?? row.assignment.subject}>
                <div className={styles.userMeta}>
                  <span className={styles.primaryText}>{getUserPrimary(row)}</span>
                  {secondary && <span className={styles.secondaryText}>{secondary}</span>}
                  <span className={`${styles.secondaryText} ${styles.mono}`}>{row.assignment.subject}</span>
                </div>
                <Can permission="acessos:default:papel:remover">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    disabled={removerPapel.isPending}
                    onClick={() => setPendingRemoval(row)}
                    aria-label={`Remover ${roleDisplayName} de ${getUserPrimary(row)}`}
                  >
                    <Trash2 size={14} />
                    Remover
                  </Button>
                </Can>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        title="Confirmar remoção de papel"
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={() => setPendingRemoval(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => void confirmRemoval()}
              disabled={removerPapel.isPending}
            >
              <Trash2 size={16} />
              Remover papel
            </Button>
          </>
        )}
      >
        {pendingRemoval && (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-3)', alignItems: 'start' }}>
            <AlertTriangle size={20} aria-hidden="true" />
            <p style={{ margin: 0 }}>
              Remover <strong>{roleDisplayName}</strong> de{' '}
              <strong>{getUserPrimary(pendingRemoval)}</strong> revoga as permissões efetivas associadas a esse papel.
              A revogação pode levar até 5 minutos para refletir em todos os caches.
            </p>
          </div>
        )}
      </Modal>
    </section>
  );
}
