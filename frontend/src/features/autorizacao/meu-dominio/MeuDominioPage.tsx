import { RefreshCw } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { useAssignments } from '../api/acessosApi';
import styles from './MeuDominioPage.module.css';

const PAGE_SIZE = 100;

export function MeuDominioPage() {
  const assignmentsQuery = useAssignments({ page: 0, size: PAGE_SIZE });
  const assignments = assignmentsQuery.data?.items ?? [];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Acessos do Meu Domínio"
        description="Consulta dos usuários e papéis filtrados pelo escopo autorizado no BFF."
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

      {assignmentsQuery.isError && (
        <div className={styles.feedbackError}>Não foi possível consultar os acessos do domínio.</div>
      )}

      <section className={styles.tablePanel} aria-label="Acessos do domínio">
        <h2 className={styles.panelTitle}>Papéis visíveis</h2>

        {assignmentsQuery.isLoading && <Loading />}

        {!assignmentsQuery.isLoading && assignments.length === 0 && (
          <div className={styles.empty}>Nenhuma atribuição encontrada para o seu domínio.</div>
        )}

        {!assignmentsQuery.isLoading && assignments.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Usuário</th>
                  <th className={styles.th}>Papéis</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.subject}>
                    <td className={styles.td}>
                      <span className={styles.primaryText}>
                        {assignment.name || assignment.email || assignment.subject}
                      </span>
                      {assignment.email && (
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
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
