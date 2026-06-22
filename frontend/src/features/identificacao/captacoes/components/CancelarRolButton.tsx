import { useState } from 'react';
import { Button } from '@/shared/components/ui/button/Button';
import { usePodeCancelar } from '../hooks/usePodeCancelar';
import { CancelarRolModal } from './CancelarRolModal';
import type { CaptacaoDetalhe } from '../types/captacao';

interface CancelarRolButtonProps {
  captacao: CaptacaoDetalhe;
}

export function CancelarRolButton({ captacao }: CancelarRolButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  
  // O hook só será ativado se a captação estiver FECHADA
  const { data: validacao, isLoading } = usePodeCancelar(captacao.id, captacao.status);

  // Consideramos que pode cancelar enquanto carrega para não dar "flash" de botão desabilitado.
  // Depois do load, verificamos o data.
  const isFechada = captacao.status?.toUpperCase() === 'FECHADA';
  
  // Se não estiver fechada, o botão nem deveria ser renderizado, 
  // mas garantimos que fique oculto caso injetado erroneamente.
  if (!isFechada) return null;

  const podeCancelar = validacao?.podeCancelar ?? true;
  const isDisabled = isLoading || !podeCancelar;
  const tooltip = (!isLoading && !validacao?.podeCancelar) ? validacao?.motivo || 'Bloqueado para cancelamento' : 'Cancelar Rol (ação crítica)';

  return (
    <>
      <Button
        variant="danger"
        onClick={() => setModalOpen(true)}
        disabled={isDisabled}
        title={tooltip}
      >
        Cancelar Rol
      </Button>

      {modalOpen && (
        <CancelarRolModal
          captacaoId={captacao.id}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
