-- ============================================================================
-- Fixtures QA Task 04 — CT-03 (FECHADA) e CT-04c (rubrica com execuções)
-- ============================================================================
-- Cria dados que NÃO podem ser produzidos via API isolada:
--   • F_FECHADA    — captação com Status='Fechada' (exige fluxo F02→F05 completo)
--   • F_COM_EXEC   — captação ABERTA com 1 execução (exige obra válida no Cadastro)
--
-- Pré-requisitos:
--   • Schema "identificacao" com seeds de Rubricas já aplicados
--   • Conexão ao banco mcad (ver .env.local para credenciais)
--
-- Uso:
--   ./setup-fixtures.sh          # aplica este script
--   ./setup-fixtures.sh --clean  # remove as fixtures
-- ============================================================================

-- Analista A (dono) — sub jrc0vems4r1q / analista_identificacao
-- Mesmo analista usado na sessão QA original.

-- =========================================================================
-- 1. F_FECHADA — RADIO 2026-07-15 Status=Fechada (CT-03)
-- =========================================================================
INSERT INTO "identificacao"."Captacoes" (
    "Id", "RubricaId", "Periodo",
    "UsuarioMusicaId", "UsuarioMusicaNome",
    "Status",
    "AnalistaResponsavelId", "AnalistaResponsavelNome",
    "DistribuicaoProcessada",
    "CriadoEm", "AtualizadoEm"
) VALUES (
    'a4f5e6d7-0001-4000-8000-000000000001',
    'b1a2c3d4-0001-0000-0000-000000000001',   -- RADIO
    '2026-07-15',
    '44444444-4444-4444-4444-444444444444',
    'QA-F04-Fixture-Fechada',
    'Fechada',
    'b51e719e-cab0-bd92-7fd7-74e2a394f6ab',    -- analista A
    'Analista Identificacao',
    false,
    NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 2. F_COM_EXEC — STREAMING_AUDIO 2026-07-16 Status=Aberta + 1 execução (CT-04c)
-- =========================================================================
INSERT INTO "identificacao"."Captacoes" (
    "Id", "RubricaId", "Periodo",
    "UsuarioMusicaId", "UsuarioMusicaNome",
    "Status",
    "AnalistaResponsavelId", "AnalistaResponsavelNome",
    "DistribuicaoProcessada",
    "CriadoEm", "AtualizadoEm"
) VALUES (
    'a4f5e6d7-0002-4000-8000-000000000002',
    'b1a2c3d4-0001-0000-0000-000000000006',   -- STREAMING_AUDIO
    '2026-07-16',
    '44444444-4444-4444-4444-444444444444',
    'QA-F04-Fixture-ComExec',
    'Aberta',
    'b51e719e-cab0-bd92-7fd7-74e2a394f6ab',    -- analista A
    'Analista Identificacao',
    false,
    NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- Execução vinculada (obra sintética — apenas para forçar ContarExecucoes > 0)
INSERT INTO "identificacao"."Execucoes" (
    "Id", "CaptacaoId",
    "ObraId", "FonogramaId",
    "ObraTitulo", "FonogramaIsrc", "ObraIswc",
    "Interpretes",
    "Inicio", "Fim", "DuracaoSegundos",
    "Quantidade",
    "TipoUtilizacaoId", "TituloPrograma",
    "Status",
    "CriadoEm", "AtualizadoEm"
) VALUES (
    'e5f6a7b8-0003-4000-8000-000000000003',
    'a4f5e6d7-0002-4000-8000-000000000002',   -- FK → F_COM_EXEC
    'c9d0e1f2-9999-4000-8000-000000000001',   -- obra sintética (não precisa existir no Cadastro para CT-04c)
    NULL,
    'Obra Fixture CT-04c',
    NULL, NULL,
    'Interprete Fixture',
    '10:00:00', '10:03:30', 210,
    1,
    NULL, NULL,
    'Identificada',
    NOW(), NOW()
)
ON CONFLICT DO NOTHING;

-- =========================================================================
-- Verificação rápida
-- =========================================================================
SELECT 'F_FECHADA'  AS fixture, "Id", "Status", "Periodo"
FROM "identificacao"."Captacoes" WHERE "Id" = 'a4f5e6d7-0001-4000-8000-000000000001'
UNION ALL
SELECT 'F_COM_EXEC', "Id", "Status", "Periodo"
FROM "identificacao"."Captacoes" WHERE "Id" = 'a4f5e6d7-0002-4000-8000-000000000002';
