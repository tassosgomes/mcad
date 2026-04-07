-- F06: Estorno de Pagamento
-- Adiciona 3 colunas nullable a tabela pagamento para suportar estorno
-- Colunas sao null enquanto pagamento esta CONFIRMADO e preenchidas no momento do estorno
ALTER TABLE arrecadacao.pagamento
    ADD COLUMN justificativa_estorno VARCHAR(500),
    ADD COLUMN estornado_por VARCHAR(200),
    ADD COLUMN estornado_em TIMESTAMPTZ;
