import { AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './FonogramaDepuracaoBanner.module.css';

interface FonogramaDepuracaoBannerProps {
  fonogramaDepuradoParaId?: string;
  className?: string;
}

export function FonogramaDepuracaoBanner({ fonogramaDepuradoParaId, className }: FonogramaDepuracaoBannerProps) {
  return (
    <div className={`${styles.banner} ${className || ''}`} role="alert">
      <div className={styles.iconContainer}>
        <AlertCircle size={20} className={styles.icon} />
      </div>
      <div className={styles.content}>
        <h4 className={styles.title}>Este fonograma foi depurado</h4>
        <p className={styles.description}>
          Esta versão é imutável e foi substituída por um registro mais recente.
        </p>
      </div>
      {fonogramaDepuradoParaId && (
        <Link to={`/cadastro/fonogramas/${fonogramaDepuradoParaId}`} className={styles.link}>
          Ver versão ativa <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
