import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, FileText, ChevronDown } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import type { ImpactoPendente } from '../types/pendente';
import styles from './ImpactoView.module.css';

interface ImpactoViewProps {
  data: ImpactoPendente[];
  onResolveLote: (item: ImpactoPendente) => void;
}

export function ImpactoView({ data, onResolveLote }: ImpactoViewProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleExpand = (identificador: string) => {
    setExpanded(prev => (prev === identificador ? null : identificador));
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('pt-BR').format(d);
  };

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Não há dados de impacto disponíveis no momento.</p>
      </div>
    );
  }

  return (
    <div className={styles.impactoContainer}>
      {data.map((item) => (
        <div key={item.identificador} className={styles.impactoItem}>
          <button 
            className={styles.impactoHeader}
            onClick={() => toggleExpand(item.identificador)}
            type="button"
          >
            <div className={styles.impactoInfo}>
              <div className={styles.impactoTitle}>
                {item.tipoIdentificador === 'isrc' ? (
                  <Music size={16} className={styles.identificadorIcon} />
                ) : (
                  <FileText size={16} className={styles.identificadorIcon} />
                )}
                {item.identificador}
              </div>
              
              {item.obraTitulo && (
                <div className={styles.impactoName} title={item.obraTitulo}>
                  "{item.obraTitulo}"
                </div>
              )}

              <div className={styles.badges}>
                <Badge variant="secondary">{item.totalExecucoes} execuções</Badge>
                <Badge variant="warning">{item.totalCaptacoes} captações</Badge>
              </div>
            </div>

            <div className={styles.actions}>
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onResolveLote(item);
                }}
              >
                Resolver todas
              </Button>
              <ChevronDown 
                size={20} 
                className={`${styles.chevron} ${expanded === item.identificador ? styles.expanded : ''}`} 
              />
            </div>
          </button>

          {expanded === item.identificador && (
            <div className={styles.impactoDrilldown}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Detalhes das captações afetadas:
              </h4>
              <div className={styles.drilldownGrid}>
                {item.captacoes?.map((c) => (
                  <div key={c.captacaoId} className={styles.captacaoCard}>
                    <Link to={`/identificacao/captacoes/${c.captacaoId}`} className={styles.captacaoLink}>
                      <span>{c.rubrica}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>
                        {formatDate(c.periodo)}
                      </span>
                    </Link>
                    <div style={{ fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 500 }}>{c.execucoesPendentes}</span> execuções pendentes nesta captação
                    </div>
                  </div>
                ))}
                {!item.captacoes?.length && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Detalhes não carregados.</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
