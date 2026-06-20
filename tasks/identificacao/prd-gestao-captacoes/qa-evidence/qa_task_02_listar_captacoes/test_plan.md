# Plano de Testes — qa_task_02 Listar Captações (RF-02)

**User Story:** RF-02 — Listar Captações com filtros, paginação e sort
**Tipos:** API + UI
**Usuário:** analista_identificacao

## Fixtures (criadas via API, pois UI de criação está bloqueada)
- STREAMING_AUDIO 2026-06-18 (QA-F02-Streaming)
- SHOW 2026-06-17 (QA-F02-Show)

## Casos de Teste

### API
- CT-01: GET /captacoes → 200, envelope {data, pagination}, colunas corretas
- CT-02: filtro rubricaId=SHOW → só Show
- CT-03: filtro periodoInicio/periodoFim → só dentro do intervalo
- CT-04: filtro status=Aberta → só Aberta
- CT-05: filtro analistaResponsavelId → só do analista
- CT-06: sort=periodo (asc) vs -periodo (desc)
- CT-07: paginação (size=2, page=1 e 2)

### UI
- CT-08: listagem renderiza colunas (rubrica, período, usuário música, status, responsável, ações)
- CT-09: filtro por rubrica (dropdown) filtra a tabela
- CT-10: filtro por status (dropdown) filtra a tabela
- CT-11: filtro por responsável (dropdown) filtra a tabela

## Estratégia de dados / cleanup
- Fixtures criadas nesta task serão removidas no final (DELETE).
