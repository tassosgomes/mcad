import { useState } from 'react';
import type { FormEvent } from 'react';
import { RefreshCw, Search, ShieldPlus, Trash2 } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { Can } from '@shared/authz';
import {
  useAssignments,
  useAtribuirPapel,
  usePapeis,
  useRemoverPapel,
  type Assignment,
  type AssignmentRole,
} from '../api/acessosApi';
import styles from './AtribuicoesPage.module.css';

const PAGE_SIZE = 50;

interface AssignmentsTableProps {
  items: Assignment[];
  isLoading: boolean;
  onRemove: (assignmentId: string) => void;
  isRemoving: boolean;
}

function getSubjectLabel(assignment: Assignment): string {
  return assignment.name || assignment.email || assignment.subject;
}

function getRoleAssignmentId(assignment: Assignment, role: AssignmentRole): string {
  return role.assignmentId ?? `${assignment.subject}:${role.key}`;
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
                          onClick={() => onRemove(getRoleAssignmentId(assignment, role))}
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

export function AtribuicoesPage() {
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const assignmentsQuery = useAssignments({ page: 0, size: PAGE_SIZE, query: submittedSearch });
  const papeisQuery = usePapeis();
  const atribuirPapel = useAtribuirPapel();
  const removerPapel = useRemoverPapel();

  const assignments = assignmentsQuery.data?.items ?? [];
  const papeis = papeisQuery.data ?? [];
  const isAssigning = atribuirPapel.isPending;

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedSearch(search);
  };

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!userId.trim() || !roleKey) {
      setFeedback({ tone: 'error', message: 'Informe usuário e papel para concluir a atribuição.' });
      return;
    }

    try {
      await atribuirPapel.mutateAsync({ userId: userId.trim(), roleKey });
      setUserId('');
      setRoleKey('');
      setFeedback({ tone: 'success', message: 'Papel atribuído com sucesso.' });
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível atribuir o papel.' });
    }
  };

  const handleRemove = async (assignmentId: string) => {
    setFeedback(null);

    try {
      await removerPapel.mutateAsync({ assignmentId });
      setFeedback({ tone: 'success', message: 'Papel removido com sucesso.' });
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
          <label className={styles.label} htmlFor="assignments-search">Buscar usuário</label>
          <input
            id="assignments-search"
            className={styles.input}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, email ou subject"
          />
        </div>
        <Button type="submit">
          <Search size={16} />
          Filtrar
        </Button>
      </form>

      <Can permission="acessos:default:papel:atribuir">
        <form className={styles.assignmentForm} onSubmit={handleAssign} aria-label="Nova atribuição">
          <div className={styles.field}>
            <label className={styles.label} htmlFor="assignment-user">Usuário</label>
            <input
              id="assignment-user"
              className={styles.input}
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="Subject ou email do usuário"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="assignment-role">Papel</label>
            <select
              id="assignment-role"
              className={styles.select}
              value={roleKey}
              onChange={(event) => setRoleKey(event.target.value)}
            >
              <option value="">Selecione um papel</option>
              {papeis.map((papel) => (
                <option key={papel.key} value={papel.key}>
                  {papel.displayName} ({papel.domain})
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={isAssigning || papeisQuery.isLoading}>
            <ShieldPlus size={16} />
            {isAssigning ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </form>
      </Can>

      {feedback && (
        <div className={feedback.tone === 'success' ? styles.feedbackSuccess : styles.feedbackError}>
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
          onRemove={(assignmentId) => void handleRemove(assignmentId)}
          isRemoving={removerPapel.isPending}
        />
      </section>
    </div>
  );
}
