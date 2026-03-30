import { useEffect } from 'react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { useAssociacoes } from '../hooks/useAssociacoes';
import { AssociacoesTable } from '../components/AssociacoesTable';
import styles from './AssociacoesPage.module.css';

export function AssociacoesPage() {
  const { data, isLoading, error, refetch } = useAssociacoes();
  
  useEffect(() => {
    document.title = 'Associações — mini-ECAD';
  }, []);

  if (isLoading) return <Loading />;
  if (error) return <ErrorState message="Erro ao carregar associações" onRetry={refetch} />;

  return (
    <div className={styles.page}>
      <PageHeader title="Associações" description="Associações de gestão coletiva do ECAD" />
      <AssociacoesTable data={data!} />
    </div>
  );
}
