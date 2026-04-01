import { Button } from '@components/ui/button';
import type { ParticipacaoItem } from '../types/participacao';
import styles from './CalcularButton.module.css';

interface CalcularButtonProps {
  participacoes: ParticipacaoItem[];
  somaCalculada: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

export function CalcularButton({ participacoes, somaCalculada, isLoading, onClick }: CalcularButtonProps) {
  const temInterprete = participacoes.some(p => p.categoria === 'INTERPRETE');
  const temProdutor = participacoes.some(p => p.categoria === 'PRODUTOR_FONOGRAFICO');
  const isDisabled = !temInterprete || !temProdutor || isLoading;

  let tooltip = '';
  if (!temInterprete && !temProdutor) tooltip = 'Adicione ao menos 1 intérprete e 1 produtor fonográfico';
  else if (!temInterprete) tooltip = 'Adicione ao menos 1 intérprete';
  else if (!temProdutor) tooltip = 'Adicione ao menos 1 produtor fonográfico';
  else if (somaCalculada) tooltip = 'Recalcular — substituirá ajustes manuais';

  return (
    <div className={styles.wrapper} title={tooltip}>
      <Button
        variant="primary"
        size="sm"
        onClick={onClick}
        type="button"
        disabled={isDisabled}
        id="btn-calcular-percentuais"
      >
        {isLoading ? 'Calculando...' : somaCalculada ? 'Recalcular' : 'Calcular Percentuais'}
      </Button>
    </div>
  );
}
