ALTER TABLE arrecadacao.rubricas ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX idx_rubricas_ativo ON arrecadacao.rubricas(ativo);
