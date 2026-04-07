-- Correcao de tipo: CHAR(7) -> VARCHAR(7) para compatibilidade com Hibernate @Column(length=7)
-- O PostgreSQL trata CHAR(n) como bpchar mas Hibernate valida como VARCHAR
ALTER TABLE arrecadacao.pagamento
    ALTER COLUMN periodo TYPE VARCHAR(7) USING periodo::VARCHAR;
