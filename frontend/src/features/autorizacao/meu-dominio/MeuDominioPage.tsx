import { useState } from 'react';
import type { FormEvent } from 'react';
import { RefreshCw, RotateCcw, Search } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { Pagination } from '@components/ui/pagination';
import { useAssignments } from '../api/acessosApi';
import styles from './MeuDominioPage.module.css';

const PAGE_SIZE = 20;

export function MeuDominioPage() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [page, setPage] = useState(0);

  const assignmentsQuery = useAssignments({ page, size: PAGE_SIZE, query: submittedQuery });
  const assignments = assignmentsQuery.data?.items ?? [];
  const total = assignmentsQuery.data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSubmittedQuery(query);
  };

  const handleReset = () => {
    setQuery('');
    setSubmittedQuery('');
    setPage(0);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Acessos do Meu Domínio"
        description="Usuários e papéis filtrados pelo escopo de domínio autorizado no BFF."
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

      <form className={styles.filters} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="meu-dominio-query">Buscar usuário</label>
          <input
            id="meu-dominio-query"
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, e-mail ou subject"
          />
        </div>
        <Button type="submit">
          <Search size={16} />
          Buscar
        </Button>
        {submittedQuery && (
          <Button variant="ghost" type="button" onClick={handleReset}>
            <RotateCcw size={16} />
            Limpar
          </Button>
        )}
      </form>

      {assignmentsQuery.isError && (
        <div className={styles.feedbackError}>Não foi possível consultar os acessos do domínio.</div>
      )}

      <section className={styles.tablePanel} aria-label="Acessos do domínio">
        {assignmentsQuery.isLoading && <Loading />}

        {!assignmentsQuery.isLoading && assignments.length === 0 && (
          <div className={styles.empty}>
            {submittedQuery
              ? `Nenhum usuário encontrado para "${submittedQuery}".`
              : 'Nenhuma atribuição encontrada para o seu domínio. Verifique se seu usuário possui admin_area configurado no serviço de autorização.'}
          </div>
        )}

        {!assignmentsQuery.isLoading && assignments.length > 0 && (
          <>
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
            <Pagination
              pagination={{
                page: page + 1,
                size: PAGE_SIZE,
                total,
                totalPages,
              }}
              onPageChange={(nextPage) => setPage(Math.max(nextPage - 1, 0))}
            />
            <p className={styles.meta}>
              {total} {total === 1 ? 'usuário' : 'usuários'} no domínio.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
