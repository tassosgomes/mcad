import { useToast } from '@components/ui/toast';
import { useDominioPublico } from '../hooks/useDominioPublico';
import type { ObraMusical } from '../types/obra';
import styles from './DominioPublicoToggle.module.css';

interface DominioPublicoToggleProps {
  obra: ObraMusical;
}

export function DominioPublicoToggle({ obra }: DominioPublicoToggleProps) {
  const { showToast } = useToast();
  const dpMutation = useDominioPublico();

  const isPending = dpMutation.isPending;

  async function handleToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.checked;
    try {
      await dpMutation.mutateAsync({ id: obra.id, data: { dominioPublico: newValue } });
      showToast(`Obra ${newValue ? 'marcada' : 'desmarcada'} como Domínio Público`, 'success');
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao alterar Domínio Público', 'error');
    }
  }

  return (
    <label className={styles.wrapper}>
      <div className={styles.toggle}>
        <input
          type="checkbox"
          checked={obra.dominioPublico}
          onChange={handleToggle}
          disabled={isPending}
          aria-label="Alternar status de domínio público"
        />
        <span className={styles.slider} />
      </div>
      <span className={styles.label}>
        Domínio Público
      </span>
    </label>
  );
}
