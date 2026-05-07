import { ArrowRight } from 'lucide-react';
import { StatusBadgeUsuarioMusica } from './StatusBadgeUsuarioMusica';
import type { HistoricoStatusUsuarioMusica } from '../types/usuario-musica';
import { formatDateTime } from '../utils/formatters';
import styles from './HistoricoStatusUsuarioMusicaTimeline.module.css';

interface HistoricoStatusUsuarioMusicaTimelineProps {
  historico: HistoricoStatusUsuarioMusica[];
}

export function HistoricoStatusUsuarioMusicaTimeline({
  historico,
}: HistoricoStatusUsuarioMusicaTimelineProps) {
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
                    <StatusBadgeUsuarioMusica status={entry.statusAnterior} />
                    <ArrowRight size={14} className={styles.arrow} />
                  </>
                ) : (
                  <span className={styles.criacao}>Cadastro</span>
                )}
                <StatusBadgeUsuarioMusica status={entry.statusNovo} />
              </div>
              <time className={styles.timestamp}>{formatDateTime(entry.data)}</time>
            </div>
            <div className={styles.meta}>
              <span className={styles.autor}>{entry.autor}</span>
              <p className={styles.justificativa}>{entry.justificativa}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
