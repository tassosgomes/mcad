import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import { RubricasTable } from '../components/RubricasTable';
import { useRubricas } from '../hooks/useRubricas';
import styles from './RubricasPage.module.css';

type ClassificacaoFilter = '' | 'sim' | 'nao';

export function RubricasPage() {
  const { data, isLoading, error, refetch } = useRubricas();
  const [busca, setBusca] = useState('');
  const [classificacao, setClassificacao] = useState<ClassificacaoFilter>('');

  useEffect(() => {
    document.title = 'Rubricas — mini-ECAD';
  }, []);

  const rubricas = data ?? [];

  const rubricasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return rubricas.filter((rubrica) => {
      const matchesTermo = termo
        ? `${rubrica.sigla} ${rubrica.nome}`.toLowerCase().includes(termo)
        : true;
      const matchesClassificacao =
        classificacao === ''
          ? true
          : rubrica.exigeClassificacao === (classificacao === 'sim');

      return matchesTermo && matchesClassificacao;
    });
  }, [busca, classificacao, rubricas]);

  const totalClassificadas = rubricas.filter((rubrica) => rubrica.exigeClassificacao).length;

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

      <div className={styles.summary} aria-label="Resumo de rubricas sincronizadas">
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total sincronizado</span>
          <span className={styles.summaryValue}>{rubricas.length}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Exigem classificação</span>
          <span className={styles.summaryValue}>{totalClassificadas}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Origem</span>
          <span className={styles.summaryText}>Eventos da Arrecadação</span>
        </div>
      </div>

      <div className={styles.filters}>
        <TextInput
          placeholder="Buscar por sigla ou nome..."
          value={busca}
          onChange={setBusca}
          aria-label="Filtrar rubricas por sigla ou nome"
        />
        <Select<ClassificacaoFilter>
          value={classificacao}
          onChange={setClassificacao}
          options={[
            { value: 'sim', label: 'Exige classificação' },
            { value: 'nao', label: 'Sem classificação' },
          ]}
          placeholder="Todas as rubricas"
          aria-label="Filtrar por exigência de classificação"
        />
      </div>

      {rubricas.length > 0 ? (
        <RubricasTable data={rubricasFiltradas} />
      ) : (
        <div className={styles.emptyState}>
          <h2>Nenhuma rubrica sincronizada</h2>
          <p>Aguardando eventos da Arrecadação para popular a cópia local.</p>
        </div>
      )}
    </div>
  );
}
