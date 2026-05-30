ALTER TABLE arrecadacao.historico_status_licenca
    ADD COLUMN ator_subject VARCHAR(128),
    ADD COLUMN autor_rotulo VARCHAR(512);

ALTER TABLE arrecadacao.historico_status_usuario
    ADD COLUMN ator_subject VARCHAR(128),
    ADD COLUMN autor_rotulo VARCHAR(512);

ALTER TABLE arrecadacao.uda_valor
    ADD COLUMN criado_por_subject VARCHAR(128),
    ADD COLUMN criado_por_rotulo VARCHAR(512);

ALTER TABLE arrecadacao.pagamento
    ADD COLUMN estornado_por_subject VARCHAR(128),
    ADD COLUMN estornado_por_rotulo VARCHAR(512);

CREATE INDEX ix_hist_licenca_ator_subject
    ON arrecadacao.historico_status_licenca (ator_subject)
    WHERE ator_subject IS NOT NULL;

CREATE INDEX ix_hist_usuario_ator_subject
    ON arrecadacao.historico_status_usuario (ator_subject)
    WHERE ator_subject IS NOT NULL;

CREATE INDEX ix_uda_valor_criado_por_subject
    ON arrecadacao.uda_valor (criado_por_subject)
    WHERE criado_por_subject IS NOT NULL;

CREATE INDEX ix_pagamento_estornado_por_subject
    ON arrecadacao.pagamento (estornado_por_subject)
    WHERE estornado_por_subject IS NOT NULL;
