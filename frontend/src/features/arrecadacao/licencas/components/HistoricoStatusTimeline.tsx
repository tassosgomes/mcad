import { ArrowRight } from 'lucide-react';
import { ActorDisplay } from '../../shared/components/actor-display';
import { StatusBadgeLicenca } from './StatusBadgeLicenca';
import type { HistoricoStatusLicenca } from '../types/licenca';
import styles from './HistoricoStatusTimeline.module.css';

interface HistoricoStatusTimelineProps {
  historico: HistoricoStatusLicenca[];
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoricoStatusTimeline({ historico }: HistoricoStatusTimelineProps) {
  if (historico.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhum histórico disponível.</p>
      </div>
    );
  }

  return (
    <div className={styles.timeline}>
      {historico.map((entry) => (
        <div key={entry.id} className={styles.entry}>
          <div className={styles.dot} />
          <div className={styles.card}>
            <div className={styles.header}>
              <div className={styles.transition}>
                {entry.statusAnterior ? (
                  <>
                    <StatusBadgeLicenca status={entry.statusAnterior} />
                    <ArrowRight size={14} className={styles.arrow} />
                  </>
                ) : (
                  <span className={styles.criacao}>—</span>
                )}
                <StatusBadgeLicenca status={entry.statusNovo} />
              </div>
              <time className={styles.timestamp}>{formatDateTime(entry.data)}</time>
            </div>
            <div className={styles.meta}>
              <ActorDisplay actor={entry.ator} fallbackLabel={entry.autor} />
              {entry.justificativa && (
                <p className={styles.justificativa}>{entry.justificativa}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
