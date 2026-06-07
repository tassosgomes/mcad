import { useState } from 'react';
import type { ReactNode } from 'react';
import styles from './DemonstrativosTab.module.css';
import {
  useListarTitularesDemonstrativo,
  useConsultarDemonstrativoTitular,
} from '../hooks/useDemonstrativos';
import { TitularesDemonstrativoTable } from './TitularesDemonstrativoTable';
import { DemonstrativoTitularPanel } from './DemonstrativoTitularPanel';

interface Props {
  processoId: string;
  statusProcesso: string;
}

export function DemonstrativosTab({ processoId, statusProcesso }: Props) {
  const [titularSelecionado, setTitularSelecionado] = useState<string | null>(null);
  const [filtroNome, setFiltroNome] = useState('');
  const [page, setPage] = useState(0);

  const { data: listagem, isLoading: listagemLoading } = useListarTitularesDemonstrativo(
    processoId,
    {
      titularNome: filtroNome || undefined,
      page,
      size: 20,
      sort: 'nome',
    }
  );

  const { data: demonstrativo, isLoading: demonstrativoLoading } =
    useConsultarDemonstrativoTitular(
      processoId,
      titularSelecionado,
      { enabled: !!titularSelecionado }
    );

  if (statusProcesso !== 'FINALIZADO') {
    return (
      <AlertBox>
        O demonstrativo estara disponivel apos a finalizacao do processo.
      </AlertBox>
    );
  }

  return (
    <div className={styles.container}>
      <TitularesDemonstrativoTable
        data={listagem}
        filtroNome={filtroNome}
        onFiltroNomeChange={(value) => {
          setFiltroNome(value);
          setPage(0);
        }}
        onTitularClick={(id) => {
          setTitularSelecionado(id);
        }}
        page={page}
        onPageChange={setPage}
      />

      {listagemLoading && <p className={styles.loading}>Carregando titulares...</p>}

      {titularSelecionado && (
        <div className={styles.panelWrapper}>
          {demonstrativoLoading && (
            <p className={styles.loading}>Carregando demonstrativo...</p>
          )}
          {demonstrativo && (
            <DemonstrativoTitularPanel demonstrativo={demonstrativo} />
          )}
        </div>
      )}
    </div>
  );
}

function AlertBox({ children }: { children: ReactNode }) {
  return <div className={styles.alert}>{children}</div>;
}
