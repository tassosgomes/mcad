import styles from './CadastroRepertorioPage.module.css';

export function CadastroRepertorioPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Novo Repertório</h1>
      <p className={styles.subtitle}>
        Cadastro unificado de repertório — obra, titulares, fonogramas e participações.
      </p>
    </div>
  );
}
