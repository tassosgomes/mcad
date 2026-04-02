import { useNavigate } from 'react-router-dom';
import { useFonogramasDaObra } from '../hooks/useFonogramasDaObra';
import { formatIsrc } from '../utils/isrcFormatter';
import { Badge } from '@components/ui/badge';
import styles from './ObraFonogramasSection.module.css';

interface ObraFonogramasSectionProps {
  obraId: string;
  obraStatus: string;
  canWrite: boolean;
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary' | 'error'> = {
  Pendente_Validacao: 'warning',
  Pendente_Documentacao: 'warning',
  Liberado: 'success',
  Depurado: 'secondary',
};

export function ObraFonogramasSection({ obraId, obraStatus, canWrite }: ObraFonogramasSectionProps) {
  const navigate = useNavigate();
  const { data: fonogramas, isLoading, isError } = useFonogramasDaObra(obraId);

  const isReadOnly = obraStatus === 'DEPURADA' || obraStatus === 'DOMINIO_PUBLICO';

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>Gestão de Fonogramas</h3>
        {canWrite && !isReadOnly && (
          <button
            className={styles.newBtn}
            onClick={() => navigate(`/cadastro/fonogramas/novo?obraId=${obraId}`)}
            type="button"
          >
            + Adicionar Novo Fonograma
          </button>
        )}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ISRC</th>
              <th>Status</th>
              <th>País Origem</th>
              <th>Lançamento</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className={styles.empty}>Carregando fonogramas...</td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={4} className={styles.empty}>Erro ao carregar fonogramas.</td>
              </tr>
            ) : !fonogramas || fonogramas.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.empty}>Nenhum fonograma associado a esta obra.</td>
              </tr>
            ) : (
              fonogramas.map((fono) => (
                <tr
                  key={fono.id}
                  className={styles.row}
                  onClick={() => navigate(`/cadastro/fonogramas/${fono.id}`)}
                >
                  <td className={styles.isrc}>{formatIsrc(fono.isrcFormatado)}</td>
                  <td>
                    <Badge variant={STATUS_VARIANT[fono.status] as any}>{fono.status.replace('_', ' ')}</Badge>
                  </td>
                  <td>{fono.paisOrigem}</td>
                  <td className={styles.data}>{fono.dataLancamento || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
