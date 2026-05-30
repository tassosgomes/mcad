import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertTriangle,
  History,
  RefreshCw,
  Search,
  ShieldPlus,
  Trash2,
} from 'lucide-react';
import { Autocomplete } from '@components/ui/autocomplete';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { Modal } from '@components/ui/modal';
import { PageHeader } from '@components/ui/page-header';
import { Can, usePermissions } from '@shared/authz';
import {
  useAssignmentHistory,
  useAssignments,
  useAtribuirPapel,
  usePapeis,
  useRemoverPapel,
  useUsuarios,
  type AcessoUsuario,
  type Assignment,
  type AssignmentAuditItem,
  type AssignmentRole,
  type Papel,
} from '../api/acessosApi';
import styles from './AtribuicoesPage.module.css';

const PAGE_SIZE = 50;
const ASSIGNMENT_HISTORY_PERMISSIONS = [
  'acessos:default:atribuicao:ver-historico',
  'acessos:cadastro:atribuicao:ver-historico',
  'acessos:identificacao:atribuicao:ver-historico',
  'acessos:arrecadacao:atribuicao:ver-historico',
  'acessos:distribuicao:atribuicao:ver-historico',
];

interface AssignmentsTableProps {
  items: Assignment[];
  isLoading: boolean;
  onRemove: (assignment: Assignment, role: AssignmentRole) => void;
  isRemoving: boolean;
}

interface PendingRemoval {
  assignment: Assignment;
  role: AssignmentRole;
}

interface RoleFiltersProps {
  domain: string;
  type: string;
  status: string;
  critical: string;
  domains: string[];
  types: string[];
  onDomainChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCriticalChange: (value: string) => void;
}

interface AssignmentHistoryProps {
  items: AssignmentAuditItem[];
  isLoading: boolean;
  isError: boolean;
}

function getSubjectLabel(assignment: Assignment): string {
  return assignment.name || assignment.email || assignment.subject;
}

function getRoleAssignmentId(assignment: Assignment, role: AssignmentRole): string {
  return role.assignmentId ?? `${assignment.userId ?? assignment.subject}:${role.roleId ?? role.key}`;
}

function getUserLabel(user: AcessoUsuario): string {
  return user.name || user.email || user.subject;
}

function getRoleLabel(role: Papel): string {
  return `${role.displayName} (${role.domain})`;
}

function uniqueSorted(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function getHistoryActor(item: AssignmentAuditItem): string {
  return item.actorSubject ?? item.subject ?? '-';
}

function getHistoryAction(item: AssignmentAuditItem): string {
  if (item.action === 'ASSIGNED') return 'Atribuição';
  if (item.action === 'REMOVED') return 'Remoção';
  return item.action ?? 'Evento';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function RoleFilters({
  domain,
  type,
  status,
  critical,
  domains,
  types,
  onDomainChange,
  onTypeChange,
  onStatusChange,
  onCriticalChange,
}: RoleFiltersProps) {
  return (
    <div className={styles.roleFilters} aria-label="Filtros de papéis">
      <div className={styles.field}>
        <label className={styles.label} htmlFor="role-domain">Domínio</label>
        <select
          id="role-domain"
          className={styles.select}
          value={domain}
          onChange={(event) => onDomainChange(event.target.value)}
        >
          <option value="">Todos</option>
          {domains.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="role-type">Tipo</label>
        <select
          id="role-type"
          className={styles.select}
          value={type}
          onChange={(event) => onTypeChange(event.target.value)}
        >
          <option value="">Todos</option>
          {types.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="role-status">Status</label>
        <select
          id="role-status"
          className={styles.select}
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value="">Todos</option>
          <option value="ACTIVE">Ativo</option>
          <option value="INACTIVE">Inativo</option>
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="role-critical">Criticidade</label>
        <select
          id="role-critical"
          className={styles.select}
          value={critical}
          onChange={(event) => onCriticalChange(event.target.value)}
        >
          <option value="">Todos</option>
          <option value="critical">Críticos</option>
          <option value="non-critical">Não críticos</option>
        </select>
      </div>
    </div>
  );
}

function AssignmentsTable({ items, isLoading, onRemove, isRemoving }: AssignmentsTableProps) {
  if (isLoading) {
    return <Loading />;
  }

  if (items.length === 0) {
    return <div className={styles.empty}>Nenhuma atribuição encontrada.</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Usuário</th>
            <th className={styles.th}>Papéis</th>
          </tr>
        </thead>
        <tbody>
          {items.map((assignment) => (
            <tr key={assignment.subject}>
              <td className={styles.td}>
                <span className={styles.primaryText}>{getSubjectLabel(assignment)}</span>
                {assignment.email && assignment.email !== getSubjectLabel(assignment) && (
                  <span className={styles.secondaryText}>{assignment.email}</span>
                )}
                <span className={`${styles.secondaryText} ${styles.mono}`}>{assignment.subject}</span>
              </td>
              <td className={styles.td}>
                <div className={styles.roles}>
                  {assignment.roles.map((role) => (
                    <span key={`${assignment.subject}-${role.key}`} className={styles.roleChip}>
                      <span className={styles.roleText}>
                        <span>{role.displayName}</span>
                        <span className={styles.roleDomain}>{role.domain}</span>
                      </span>
                      <Can permission="acessos:default:papel:remover">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          disabled={isRemoving}
                          onClick={() => onRemove(assignment, role)}
                          aria-label={`Remover ${role.displayName} de ${getSubjectLabel(assignment)}`}
                        >
                          <Trash2 size={14} />
                          Remover
                        </Button>
                      </Can>
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssignmentHistory({ items, isLoading, isError }: AssignmentHistoryProps) {
  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <div className={styles.feedbackError}>Não foi possível consultar o histórico de atribuições.</div>;
  }

  if (items.length === 0) {
    return <div className={styles.empty}>Nenhum evento de atribuição encontrado.</div>;
  }

  return (
    <div className={styles.historyList}>
      {items.map((item) => (
        <article className={styles.historyItem} key={item.id}>
          <div className={styles.historyHeader}>
            <Badge variant={item.action === 'REMOVED' ? 'warning' : 'success'}>
              {getHistoryAction(item)}
            </Badge>
            <time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time>
          </div>
          <dl className={styles.historyMeta}>
            <div>
              <dt>Usuário</dt>
              <dd>{item.targetUserId ?? '-'}</dd>
            </div>
            <div>
              <dt>Papel</dt>
              <dd>{item.roleKey ?? '-'}</dd>
            </div>
            <div>
              <dt>Ator</dt>
              <dd>{getHistoryActor(item)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

export function AtribuicoesPage() {
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AcessoUsuario | null>(null);
  const [roleKey, setRoleKey] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [criticalFilter, setCriticalFilter] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const { hasAny } = usePermissions();

  const assignmentsQuery = useAssignments({ page: 0, size: PAGE_SIZE, query: submittedSearch });
  const usuariosQuery = useUsuarios(
    { page: 0, size: 10, query: userSearch },
    userSearch.trim().length >= 2,
  );
  const papeisQuery = usePapeis({
    page: 0,
    size: 200,
    domain: domainFilter || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });
  const canReadHistory = hasAny(ASSIGNMENT_HISTORY_PERMISSIONS);
  const historyQuery = useAssignmentHistory(
    {
      page: 0,
      size: 10,
      userId: selectedUser?.id,
      roleKey: roleKey || undefined,
    },
    canReadHistory,
  );
  const atribuirPapel = useAtribuirPapel();
  const removerPapel = useRemoverPapel();

  const assignments = assignmentsQuery.data?.items ?? [];
  const papeis = papeisQuery.data ?? [];
  const filteredPapeis = useMemo(
    () => papeis.filter((papel) => {
      if (criticalFilter === 'critical') return papel.critical === true;
      if (criticalFilter === 'non-critical') return papel.critical !== true;
      return true;
    }),
    [criticalFilter, papeis],
  );
  const domains = useMemo(() => uniqueSorted(papeis.map((papel) => papel.domain)), [papeis]);
  const types = useMemo(() => uniqueSorted(papeis.map((papel) => papel.type)), [papeis]);
  const selectedRole = filteredPapeis.find((papel) => papel.key === roleKey) ?? null;
  const isAssigning = atribuirPapel.isPending;

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedSearch(search);
  };

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!selectedUser || !roleKey) {
      setFeedback({ tone: 'error', message: 'Selecione usuário e papel para concluir a atribuição.' });
      return;
    }

    try {
      await atribuirPapel.mutateAsync({ userId: selectedUser.id, roleKey });
      setRoleKey('');
      setFeedback({
        tone: 'success',
        message: 'Papel atribuído com sucesso. A propagação das permissões pode levar até 5 minutos.',
      });
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível atribuir o papel.' });
    }
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) {
      return;
    }

    setFeedback(null);

    try {
      await removerPapel.mutateAsync({
        assignmentId: getRoleAssignmentId(pendingRemoval.assignment, pendingRemoval.role),
      });
      setPendingRemoval(null);
      setFeedback({
        tone: 'success',
        message: 'Papel removido com sucesso. A revogação pode levar até 5 minutos para refletir em toda a sessão.',
      });
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível remover o papel.' });
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Atribuir Acessos"
        description="Gestão auditável de papéis de usuários no mcad."
        action={(
          <Button
            variant="secondary"
            type="button"
            onClick={() => void assignmentsQuery.refetch()}
            disabled={assignmentsQuery.isFetching}
          >
            <RefreshCw size={16} />
            Atualizar
          </Button>
        )}
      />

      <form className={styles.filters} onSubmit={handleFilterSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="assignments-search">Buscar atribuições</label>
          <input
            id="assignments-search"
            className={styles.input}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, email ou identificador"
          />
        </div>
        <Button type="submit">
          <Search size={16} />
          Filtrar
        </Button>
      </form>

      <Can permission="acessos:default:papel:atribuir">
        <form className={styles.assignmentForm} onSubmit={handleAssign} aria-label="Nova atribuição">
          <div className={styles.userPicker}>
            <label className={styles.label} htmlFor="assignment-user">Usuário</label>
            <Autocomplete
              id="assignment-user"
              placeholder="Buscar por nome, email ou identificador"
              value={userSearch}
              onSearch={(value) => {
                setUserSearch(value);
                setSelectedUser(null);
              }}
              results={usuariosQuery.data?.items ?? []}
              isLoading={usuariosQuery.isFetching}
              onSelect={(user) => {
                setSelectedUser(user);
                setUserSearch(getUserLabel(user));
              }}
              renderItem={(user) => (
                <span className={styles.userResult}>
                  <span>{getUserLabel(user)}</span>
                  <span>{user.email ?? user.subject}</span>
                </span>
              )}
            />
            {selectedUser && (
              <span className={styles.selectedUser}>
                Selecionado: {getUserLabel(selectedUser)}
              </span>
            )}
          </div>

          <RoleFilters
            domain={domainFilter}
            type={typeFilter}
            status={statusFilter}
            critical={criticalFilter}
            domains={domains}
            types={types}
            onDomainChange={(value) => {
              setDomainFilter(value);
              setRoleKey('');
            }}
            onTypeChange={(value) => {
              setTypeFilter(value);
              setRoleKey('');
            }}
            onStatusChange={(value) => {
              setStatusFilter(value);
              setRoleKey('');
            }}
            onCriticalChange={(value) => {
              setCriticalFilter(value);
              setRoleKey('');
            }}
          />

          <div className={styles.field}>
            <label className={styles.label} htmlFor="assignment-role">Papel</label>
            <select
              id="assignment-role"
              className={styles.select}
              value={roleKey}
              onChange={(event) => setRoleKey(event.target.value)}
              disabled={papeisQuery.isLoading}
            >
              <option value="">Selecione um papel</option>
              {filteredPapeis.map((papel) => (
                <option key={papel.key} value={papel.key}>
                  {getRoleLabel(papel)}{papel.critical ? ' - crítico' : ''}
                </option>
              ))}
            </select>
            {selectedRole?.description && (
              <span className={styles.roleDescription}>{selectedRole.description}</span>
            )}
          </div>

          <Button type="submit" disabled={isAssigning || papeisQuery.isLoading}>
            <ShieldPlus size={16} />
            {isAssigning ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </form>
      </Can>

      {feedback && (
        <div
          className={feedback.tone === 'success' ? styles.feedbackSuccess : styles.feedbackError}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      )}

      {assignmentsQuery.isError && (
        <div className={styles.feedbackError}>Não foi possível consultar as atribuições.</div>
      )}

      <section className={styles.tablePanel} aria-label="Atribuições existentes">
        <h2 className={styles.panelTitle}>Atribuições existentes</h2>
        <AssignmentsTable
          items={assignments}
          isLoading={assignmentsQuery.isLoading}
          onRemove={(assignment, role) => setPendingRemoval({ assignment, role })}
          isRemoving={removerPapel.isPending}
        />
      </section>

      <Can anyOf={ASSIGNMENT_HISTORY_PERMISSIONS}>
        <section className={styles.tablePanel} aria-label="Histórico de atribuições">
          <div className={styles.panelHeading}>
            <div>
              <h2 className={styles.panelTitle}>Histórico</h2>
              <p className={styles.panelSubtitle}>Atribuições e remoções consolidadas pela Auditoria.</p>
            </div>
            <History size={18} aria-hidden="true" />
          </div>
          <AssignmentHistory
            items={historyQuery.data?.items ?? []}
            isLoading={historyQuery.isLoading}
            isError={historyQuery.isError}
          />
        </section>
      </Can>

      <Modal
        isOpen={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        title="Confirmar remoção de papel"
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={() => setPendingRemoval(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={() => void confirmRemoval()} disabled={removerPapel.isPending}>
              <Trash2 size={16} />
              Remover papel
            </Button>
          </>
        )}
      >
        {pendingRemoval && (
          <div className={styles.confirmation}>
            <AlertTriangle size={20} aria-hidden="true" />
            <p>
              Remover <strong>{pendingRemoval.role.displayName}</strong> de{' '}
              <strong>{getSubjectLabel(pendingRemoval.assignment)}</strong> revoga as permissões efetivas
              associadas a esse papel. A revogação pode levar até 5 minutos para refletir em todos os caches.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
