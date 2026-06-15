import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@components/ui/page-header';
import { TextInput } from '@components/ui/text-input';
import { Loading } from '@components/ui/loading';
import { useMinhasObras, useMeusFonogramas } from '../../repertorio/hooks/useRepertorio';
import styles from './RepertorioPage.module.css';

type TabOption = 'obras' | 'fonogramas';

export function RepertorioPage() {
  const [activeTab, setActiveTab] = useState<TabOption>('obras');
  const [filtro, setFiltro] = useState('');
  const [sort, setSort] = useState('titulo');
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <PageHeader title="Meu Repertório" description="Consulte as obras e fonogramas vinculados ao seu cadastro." />
      <div className={styles.content}>
        <div className={styles.tabs} role="tablist" aria-label="Tipo de repertório">
          <button
            className={[styles.tab, activeTab === 'obras' ? styles.tabActive : ''].join(' ')}
            onClick={() => setActiveTab('obras')}
            type="button"
            role="tab"
            aria-selected={activeTab === 'obras'}
          >
            Minhas Obras
          </button>
          <button
            className={[styles.tab, activeTab === 'fonogramas' ? styles.tabActive : ''].join(' ')}
            onClick={() => setActiveTab('fonogramas')}
            type="button"
            role="tab"
            aria-selected={activeTab === 'fonogramas'}
          >
            Meus Fonogramas
          </button>
        </div>

        <div className={styles.filters}>
          <TextInput
            value={filtro}
            onChange={setFiltro}
            placeholder="Filtrar por título..."
            aria-label="Filtrar por título"
          />
          <button
            className={styles.sortBtn}
            type="button"
            onClick={() => setSort((s) => (s === 'titulo' ? '-titulo' : 'titulo'))}
            aria-label={sort === 'titulo' ? 'Ordenado A-Z. Clique para Z-A.' : 'Ordenado Z-A. Clique para A-Z.'}
          >
            {sort === 'titulo' ? 'A-Z' : 'Z-A'}
          </button>
        </div>

        {activeTab === 'obras' ? (
          <ObrasTab filtro={filtro} sort={sort} onReportar={(obraId: string, titulo: string) =>
            navigate(`/portal/ocorrencias/abrir?obraId=${obraId}&titulo=${encodeURIComponent(titulo)}`)
          } />
        ) : (
          <FonogramasTab filtro={filtro} sort={sort} onReportar={(fonogramaId: string, titulo: string) =>
            navigate(`/portal/ocorrencias/abrir?fonogramaId=${fonogramaId}&titulo=${encodeURIComponent(titulo)}`)
          } />
        )}
      </div>
    </div>
  );
}

function ObrasTab({
  filtro,
  sort,
  onReportar,
}: {
  filtro: string;
  sort: string;
  onReportar: (id: string, titulo: string) => void;
}) {
  const { data, isLoading, error } = useMinhasObras({ titulo: filtro || undefined, sort });

  if (isLoading) return <Loading />;
  if (error) return <div className={styles.errorState}>Erro ao carregar obras.</div>;

  const items = data ?? [];

  if (items.length === 0) {
    return <div className={styles.emptyState}>Nenhuma obra encontrada.</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>TÍTULO</th>
            <th className={styles.th}>CATEGORIA</th>
            <th className={styles.th}>ISWC</th>
            <th className={styles.th}>PERCENTUAL</th>
            <th className={`${styles.th} ${styles.thAction}`} aria-label="Ações">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          {items.map((obra) => (
            <tr key={obra.id} className={styles.row}>
              <td className={styles.td}>{obra.titulo}</td>
              <td className={styles.td}>{obra.categoria ?? '—'}</td>
              <td className={[styles.td, styles.mono].join(' ')}>{obra.iswc ?? '—'}</td>
              <td className={styles.td}>{obra.percentual}%</td>
              <td className={styles.td}>
                <button
                  className={styles.reportBtn}
                  type="button"
                  onClick={() => onReportar(obra.id, obra.titulo)}
                  aria-label={`Reportar erro em ${obra.titulo}`}
                >
                  Reportar erro
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FonogramasTab({
  filtro,
  sort,
  onReportar,
}: {
  filtro: string;
  sort: string;
  onReportar: (id: string, titulo: string) => void;
}) {
  const { data, isLoading, error } = useMeusFonogramas({ titulo: filtro || undefined, sort });

  if (isLoading) return <Loading />;
  if (error) return <div className={styles.errorState}>Erro ao carregar fonogramas.</div>;

  const items = data ?? [];

  if (items.length === 0) {
    return <div className={styles.emptyState}>Nenhum fonograma encontrado.</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>TÍTULO</th>
            <th className={styles.th}>ISRC</th>
            <th className={styles.th}>PAPEL</th>
            <th className={styles.th}>PERCENTUAL</th>
            <th className={`${styles.th} ${styles.thAction}`} aria-label="Ações">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          {items.map((fon) => (
            <tr key={fon.id} className={styles.row}>
              <td className={styles.td}>{fon.titulo}</td>
              <td className={[styles.td, styles.mono].join(' ')}>{fon.isrc ?? '—'}</td>
              <td className={styles.td}>{fon.papel ?? '—'}</td>
              <td className={styles.td}>{fon.percentual}%</td>
              <td className={styles.td}>
                <button
                  className={styles.reportBtn}
                  type="button"
                  onClick={() => onReportar(fon.id, fon.titulo)}
                  aria-label={`Reportar erro em ${fon.titulo}`}
                >
                  Reportar erro
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
