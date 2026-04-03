import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useObra } from '../hooks/useObra';
import styles from './DepuracaoBanner.module.css';

interface DepuracaoBannerProps {
  obraDepuradaParaId: string;
}

export function DepuracaoBanner({ obraDepuradaParaId }: DepuracaoBannerProps) {
  const { data: novaObra } = useObra(obraDepuradaParaId);

  return (
    <div className={styles.banner}>
      <AlertCircle className={styles.icon} size={24} />
      <div className={styles.content}>
        <p className={styles.text}>Esta obra foi depurada.</p>
        <Link to={`/cadastro/obras/${obraDepuradaParaId}`} className={styles.link}>
          Ela foi substituída por uma nova versão {novaObra ? `(#${novaObra.codigo})` : ''} →
        </Link>
      </div>
    </div>
  );
}
