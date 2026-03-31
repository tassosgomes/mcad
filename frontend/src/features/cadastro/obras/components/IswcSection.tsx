import { useToast } from '@components/ui/toast';
import { Button } from '@components/ui/button';
import { useObterIswc } from '../hooks/useObterIswc';
import type { ObraMusical } from '../types/obra';
import styles from './IswcSection.module.css';

interface IswcSectionProps {
  obra: ObraMusical;
  temTitulares: boolean;
}

export function IswcSection({ obra, temTitulares }: IswcSectionProps) {
  const { showToast } = useToast();
  const obterIswcMutation = useObterIswc();

  const isDisabled = obra.status !== 'PENDENTE' || !temTitulares || obra.iswc !== null;
  const isPending = obterIswcMutation.isPending;

  const tooltipText = !temTitulares
    ? 'Adicione titulares autorais'
    : obra.iswc
    ? 'ISWC já obtido'
    : obra.status !== 'PENDENTE'
    ? 'Disponível apenas para obras pendentes'
    : '';

  const buttonLabel = isPending ? 'Obtendo...' : obra.iswc ? 'ISWC Obtido' : 'Obter ISWC';

  async function handleObter() {
    if (isDisabled || isPending) return;
    try {
      await obterIswcMutation.mutateAsync(obra.id);
      showToast('ISWC obtido com sucesso', 'success');
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao obter ISWC', 'error');
    }
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.title}>Código ISWC</h3>
      <span className={styles.iswcValue} title={obra.iswc || 'Sem código ISWC'}>
        {obra.iswc || '—'}
      </span>

      <div className={styles.tooltipWrapper} title={tooltipText}>
        <Button
          variant="primary"
          onClick={handleObter}
          disabled={isDisabled || isPending}
          className={`${styles.btnWrapper} ${isDisabled ? styles.disabledBtn : ''}`}
          type="button"
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
