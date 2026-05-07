import { useEffect } from 'react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { RubricasTable } from '../components/RubricasTable';
import { useRubricas } from '../hooks/useRubricas';
import styles from './RubricasPage.module.css';

export function RubricasPage() {
  const { data, isLoading, error, refetch } = useRubricas();

  useEffect(() => {
    document.title = 'Rubricas — mini-ECAD';
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorState message="Erro ao carregar rubricas" onRetry={() => void refetch()} />;
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Rubricas"
        description="Rubricas sincronizadas automaticamente da Arrecadação para uso read-only na Distribuição."
      />

      <div className={styles.notice}>
        <p>Dados somente leitura. As atualizações acontecem por eventos publicados pela Arrecadação.</p>
      </div>

      {data && data.length > 0 ? (
        <RubricasTable data={data} />
      ) : (
        <div className={styles.emptyState}>
          <h2>Nenhuma rubrica sincronizada</h2>
          <p>Aguardando eventos da Arrecadação para popular a cópia local.</p>
        </div>
      )}
    </div>
  );
}
