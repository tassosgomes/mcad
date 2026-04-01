import { useNavigate } from 'react-router-dom';
import { useDepurarFonograma } from '../hooks/useDepurarFonograma';
import type { DepurarFonogramaRequest } from '../types/fonograma';
import styles from './FonogramaDepuracaoModal.module.css';

interface FonogramaDepuracaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fonogramaId: string;
  isrcAtual: string;
  novoIsrc: string;
  paisOrigem: string;
  dataGravacao?: string;
  dataLancamento?: string;
}

export function FonogramaDepuracaoModal({
  isOpen,
  onClose,
  fonogramaId,
  isrcAtual,
  novoIsrc,
  paisOrigem,
  dataGravacao,
  dataLancamento,
}: FonogramaDepuracaoModalProps) {
  const navigate = useNavigate();
  const { mutateAsync: depurar, isPending } = useDepurarFonograma();

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      const payload: DepurarFonogramaRequest = {
        isrc: novoIsrc.replace(/-/g, ''),
        paisOrigem,
        dataGravacao: dataGravacao || undefined,
        dataLancamento: dataLancamento || undefined,
      };

      const response = await depurar({ id: fonogramaId, data: payload });
      onClose();
      // Wait a moment for UX, then navigate to new fonograma
      setTimeout(() => {
        navigate(`/cadastro/fonogramas/${response.novoFonogramaId}`);
      }, 300);
    } catch (error) {
      console.error('Falha ao depurar fonograma', error);
      alert('Ocorreu um erro ao tentar depurar o fonograma. Verifique os dados e tente novamente.');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <h3 className={styles.title}>Confirmação de Depuração</h3>
        <p className={styles.message}>
          Você está alterando o ISRC de um fonograma que já está <strong>Liberado</strong>.
          <br /><br />
          Isso fará com que o registro atual (<strong>{isrcAtual}</strong>) se torne imutável (status <strong>Depurado</strong>).
          Um novo registro (<strong>{novoIsrc}</strong>) será criado na mesma obra musical para substituir este.
          <br /><br />
          Deseja prosseguir com a depuração?
        </p>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isPending} type="button">
            Voltar
          </button>
          <button className={styles.confirmBtn} onClick={handleConfirm} disabled={isPending} type="button">
            {isPending ? 'Processando...' : 'Confirmar Depuração'}
          </button>
        </div>
      </div>
    </div>
  );
}
