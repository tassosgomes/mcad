import { usePermissions } from '@shared/authz';
import { Button } from '@components/ui/button';
import type { Processo } from '../types/processo';
import styles from './ProcessoActions.module.css';

interface ProcessoActionsProps {
  processo: Processo;
  onCalcular: () => void;
  onAprovar: () => void;
  onFinalizar: () => void;
  onCancelar: () => void;
  isLoading: boolean;
}

export function ProcessoActions({
  processo,
  onCalcular,
  onAprovar,
  onFinalizar,
  onCancelar,
  isLoading,
}: ProcessoActionsProps) {
  const { can } = usePermissions();

  const canCalcular = can('distribuicao:default:processo:calcular');
  const canAprovar = can('distribuicao:default:processo:aprovar');
  const canFinalizar = can('distribuicao:default:processo:finalizar');
  const canCancelar = can('distribuicao:default:processo:cancelar');

  const { status } = processo;

  if (status === 'FINALIZADO' || status === 'CANCELADO') {
    return null;
  }

  const hasAnyAction =
    (status === 'CRIADO' && (canCalcular || canCancelar)) ||
    (status === 'CALCULADO' && (canAprovar || canCancelar)) ||
    (status === 'APROVADO' && (canFinalizar || canCancelar));

  if (!hasAnyAction) {
    return null;
  }

  return (
    <div className={styles.actions}>
      {status === 'CRIADO' && canCalcular && (
        <Button
          variant="primary"
          onClick={onCalcular}
          disabled={isLoading}
          type="button"
          id="btn-calcular-processo"
        >
          {isLoading ? 'Calculando...' : 'Calcular'}
        </Button>
      )}

      {status === 'CALCULADO' && canAprovar && (
        <Button
          variant="primary"
          onClick={onAprovar}
          disabled={isLoading}
          type="button"
          id="btn-aprovar-processo"
        >
          {isLoading ? 'Aprovando...' : 'Aprovar'}
        </Button>
      )}

      {status === 'APROVADO' && canFinalizar && (
        <Button
          variant="primary"
          onClick={onFinalizar}
          disabled={isLoading}
          type="button"
          id="btn-finalizar-processo"
        >
          {isLoading ? 'Finalizando...' : 'Finalizar'}
        </Button>
      )}

      {(status === 'CRIADO' || status === 'CALCULADO' || status === 'APROVADO') && canCancelar && (
        <Button
          variant="danger"
          onClick={onCancelar}
          disabled={isLoading}
          type="button"
          id="btn-cancelar-processo"
        >
          Cancelar
        </Button>
      )}
    </div>
  );
}
