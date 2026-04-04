import { useState } from 'react';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Pagination } from '@components/ui/pagination';
import { useDocumentTitle } from '@hooks/useDocumentTitle';

import type { ExecucaoPendente, ImpactoPendente, PendenteListFilters, ImpactoPendenteFilters } from '../types/pendente';
import { usePendentes } from '../hooks/usePendentes';
import { useImpactoPendentes } from '../hooks/useImpactoPendentes';

import { PendentesFilters } from '../components/PendentesFilters';
import { PendentesTable } from '../components/PendentesTable';
import { ImpactoView } from '../components/ImpactoView';
import { ResolverPendenteModal } from '../components/ResolverPendenteModal';
import { ResolverLoteModal } from '../components/ResolverLoteModal';

import styles from './PendentesPage.module.css';

export function PendentesPage() {
  const [activeTab, setActiveTab] = useState<'lista' | 'impacto'>('lista');
  
  // State for Lista tab
  const [filtros, setFiltros] = useState<PendenteListFilters>({ page: 1, size: 20, sort: '-criadoEm' });
  const { data: pendentesData, isLoading: isLoadingPendentes, error: erroPendentes, refetch: refetchPendentes } = usePendentes(filtros);

  // State for Impacto tab
  const [impactoFiltros, setImpactoFiltros] = useState<ImpactoPendenteFilters>({ page: 1, size: 20, sort: '-totalExecucoes' });
  const { data: impactoData, isLoading: isLoadingImpacto, error: erroImpacto, refetch: refetchImpacto } = useImpactoPendentes(impactoFiltros);

  // Modals state
  const [pendenteParaResolver, setPendenteParaResolver] = useState<ExecucaoPendente | null>(null);
  const [impactoParaLote, setImpactoParaLote] = useState<ImpactoPendente | null>(null);

  useDocumentTitle('Pendentes — Identificação');

  return (
    <div className={styles.page}>
      <PageHeader 
        title="Execuções Pendentes" 
        description="Identificação de execuções de músicas que não puderam ser associadas automaticamente aos registros do Cadastro."
      />

      <div className={styles.tabs} role="tablist">
        <button 
          role="tab"
          aria-selected={activeTab === 'lista'}
          className={`${styles.tab} ${activeTab === 'lista' ? styles.active : ''}`} 
          onClick={() => setActiveTab('lista')}
        >
          Lista Detalhada
        </button>
        <button 
          role="tab"
          aria-selected={activeTab === 'impacto'}
          className={`${styles.tab} ${activeTab === 'impacto' ? styles.active : ''}`} 
          onClick={() => setActiveTab('impacto')}
        >
          Visão de Impacto
        </button>
      </div>

      {activeTab === 'lista' && (
        <>
          <PendentesFilters filtros={filtros} onChange={setFiltros} />
          
          {isLoadingPendentes ? (
            <Loading />
          ) : erroPendentes ? (
            <ErrorState onRetry={() => refetchPendentes()} />
          ) : (
            <>
              <PendentesTable 
                data={pendentesData!.data} 
                sort={filtros.sort ?? '-criadoEm'}
                onSortChange={(sort) => setFiltros(f => ({ ...f, sort, page: 1 }))}
                onResolve={setPendenteParaResolver} 
              />
              <Pagination
                pagination={pendentesData!.pagination}
                onPageChange={(page) => setFiltros(f => ({ ...f, page }))}
              />
            </>
          )}
        </>
      )}

      {activeTab === 'impacto' && (
        <>
          {isLoadingImpacto ? (
            <Loading />
          ) : erroImpacto ? (
            <ErrorState onRetry={() => refetchImpacto()} />
          ) : (
            <>
              <ImpactoView 
                data={impactoData!.data} 
                onResolveLote={setImpactoParaLote} 
              />
              <Pagination
                pagination={impactoData!.pagination}
                onPageChange={(page) => setImpactoFiltros(f => ({ ...f, page }))}
              />
            </>
          )}
        </>
      )}

      {pendenteParaResolver && (
        <ResolverPendenteModal
          execucao={pendenteParaResolver}
          isOpen={true}
          onClose={() => setPendenteParaResolver(null)}
        />
      )}

      {impactoParaLote && (
        <ResolverLoteModal
          impactoItem={impactoParaLote}
          isOpen={true}
          onClose={() => setImpactoParaLote(null)}
        />
      )}
    </div>
  );
}
