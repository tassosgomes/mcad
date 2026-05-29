import { Can, usePermissions } from '@shared/authz';
import { Button } from '@components/ui/button';
import type { Processo } from '../types/processo';
import styles from './ProcessoActions.module.css';

interface ProcessoActionsProps {
  processo: Processo;
  onCalcular: () => void;
  onRecalcular?: () => void;
  onAprovar: () => void;
  onFinalizar: () => void;
  onCancelar: () => void;
  onExportar?: () => void;
  isLoading: boolean;
}

export function ProcessoActions({
  processo,
  onCalcular,
  onRecalcular,
  onAprovar,
  onFinalizar,
  onCancelar,
  onExportar,
  isLoading,
}: ProcessoActionsProps) {
  const { can } = usePermissions();

  const canCalcular = can('distribuicao:default:processo:calcular');
  const canRecalcular = can('distribuicao:default:processo:recalcular-pos-calculado');
  const canAprovar = can('distribuicao:default:processo:aprovar');
  const canFinalizar = can('distribuicao:default:processo:finalizar');
  const canCancelar = can('distribuicao:default:processo:cancelar');
  const canExportar = can('distribuicao:default:processo:exportar');

  const { status } = processo;

  if (status === 'FINALIZADO' || status === 'CANCELADO') {
    return null;
  }

  const hasAnyAction =
    (status === 'CRIADO' && (canCalcular || canCancelar)) ||
    (status === 'CALCULADO' && (canRecalcular || canAprovar || canCancelar)) ||
    (status === 'APROVADO' && (canRecalcular || canFinalizar || canCancelar)) ||
    canExportar;

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

      {(status === 'CALCULADO' || status === 'APROVADO') && (
        <Can permission="distribuicao:default:processo:recalcular-pos-calculado">
          <Button
            variant="secondary"
            onClick={onRecalcular}
            disabled={isLoading || !onRecalcular}
            type="button"
            id="btn-recalcular-processo"
          >
            {isLoading ? 'Recalculando...' : 'Recalcular'}
          </Button>
        </Can>
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

      <Can permission="distribuicao:default:processo:exportar">
        <Button
          variant="secondary"
          onClick={onExportar}
          disabled={isLoading || !onExportar}
          type="button"
          id="btn-exportar-processo"
        >
          Exportar
        </Button>
      </Can>

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
