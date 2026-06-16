---
status: pending
parallelizable: false
blocked_by: ["3.0", "5.0", "6.0"]
---

<task_context>
<domain>engine/infra/testing</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 7.0: Testes de Integração (Testcontainers) end-to-end

## Visão Geral

Valida as três features em conjunto, contra um PostgreSQL real (Testcontainers) com a tabela `usuarios_identidade` populada. Estes testes cruzam fronteiras: a combo (F1) precisa casar IDs com captações criadas com nome resolvido (F2), e o backfill (F3) precisa corrigir o histórico. Também cobre o cenário de autorização 403 do endpoint de manutenção.

O projeto já possui infraestrutura de testes de integração com Testcontainers em `5-Tests/Identificacao.IntegrationTests`. Esta tarefa a estende — **não** cria nova infraestrutura.

## Requisitos

- Seed realista em `usuarios_identidade` (ativo, suspenso, excluído) + captações (com nome "Desconhecido" e com nome resolvido).
- `GET /api/v1/analistas` retorna apenas ativos, ordenados por nome, com `Id` casável.
- E2E do filtro: criar captação (nome resolvido) → `GET /captacoes?analistaResponsavelId={id-da-combo}` retorna a captação.
- Backfill: atualiza só "Desconhecido", retorna contagem, idempotente; **403** sem papel admin.

## Subtarefas

- [ ] 7.1 Localizar o fixture/base de Testcontainers existente em `5-Tests/Identificacao.IntegrationTests` (classe `WebApplicationFactory` + container PostgreSQL). Reaproveitar o setup de schema/migrações.
- [ ] 7.2 Criar helper de seed para `usuarios_identidade` (INSERT raw SQL, já que a tabela é gerida por raw SQL). Inserir: 2 ativos, 1 suspenso, 1 excluído (`deleted_at_utc` setado), com `logto_user_id` conhecidos (ex.: um Guid válido e um `sub`-like string para exercitar o `FromSubject`).
- [ ] 7.3 Teste `GET /api/v1/analistas`:
  - retorna apenas os 2 ativos (exclui suspenso e excluído);
  - ordenados por `NomeExibicao`;
  - `Id` de um analista com `logto_user_id` = string não-Guid bate com `AnalistaIdentificador.FromSubject(...)` computado no teste.
- [ ] 7.4 Teste E2E do filtro (F1 + F2):
  - criar uma captação via `POST /captacoes` autenticado com um `sub` presente na projeção;
  - afirmar que o `AnalistaResponsavel.Nome` da resposta é o `NomeExibicao` da projeção (não "Desconhecido", não o claim);
  - chamar `GET /captacoes?analistaResponsavelId={id-do-analista-da-combo}` → a captação criada aparece;
  - chamar `GET /captacoes` sem o filtro → também aparece.
- [ ] 7.5 Teste do backfill (F3):
  - seed de captações antigas com `AnalistaResponsavelNome = "Desconhecido"` (uma casável com um ativo, uma casável com um suspenso, uma não-casável com Guid inexistente);
  - `POST .../manutencao/reprocessar-responsaveis` como admin → `{ totalAnalisadas: 3, totalCorrigidas: 2 }`;
  - afirmar que as 2 casáveis mudaram de nome (ativo e suspenso) e a não-casável permanece "Desconhecido";
  - **idempotência**: reexecutar → `totalCorrigidas: 0`.
- [ ] 7.6 Teste de autorização 403:
  - `POST .../manutencao/reprocessar-responsaveis` sem o papel admin → `403 Forbidden`.
- [ ] 7.7 (Opcional) Teste do fallback de F2 via integração: token cujo `sub` **não** está na projeção mas traz claim `name` → nome da claim; token sem `sub` na projeção e sem claim → "Desconhecido".
- [ ] 7.8 `dotnet test 5-Tests/Identificacao.IntegrationTests` verde (requer Docker para Testcontainers).

## Sequenciamento

- Bloqueado por: 3.0 (endpoint analistas), 5.0 (resolução de nome no cadastro), 6.0 (backfill + autorização).
- Desbloqueia: (entrega final — feature pronta para validação/manual QA).
- Paralelizável: **Não** — é a tarefa de fechamento que valida as três features juntas. Pode começar parcialmente (teste de `GET /analistas`) assim que 3.0 estiver pronto, mas os testes E2E e de backfill exigem 5.0 e 6.0.

## Detalhes de Implementação

**Seed de `usuarios_identidade`:** usar `context.Database.ExecuteSqlRawAsync(...)` com o mesmo formato de colunas do `IdentityUserEventConsumer` (`logto_user_id`, `username`, `display_name`, `email`, `roles` como jsonb, `is_suspended`, `deleted_at_utc`, `last_event_*`). Garantir ao menos um `logto_user_id` que **não** seja um Guid (ex.: `"user-abc123"`) para validar o caminho MD5 do `FromSubject`.

**Autenticação nos testes:** o serviço usa `AUTH_ENABLED` (toggle). Se os testes de integração rodam com `AUTH_ENABLED=false`, simular o usuário/claims via claims de teste na `WebApplicationFactory` (injetar um `sub`/`name`/roles controlados). Para o teste 403, é preciso que o caminho de autorização esteja ativo — confirmar como o projeto testa permissões hoje (provavelmente com `AUTH_ENABLED=true` + claims de papel, ou um `TestAuthHandler`).

**Casamento de ID é a propriedade-chave:** o teste E2E deve provar que o `Id` retornado por `GET /analistas` filtra corretamente em `GET /captacoes` — ou seja, combo, cadastro e filtro apontam para o mesmo usuário. Esse é o coração da Tech Spec.

**Observabilidade:** o backfill deve produzir o log estruturado com contagens — pode-se capturar logs nos testes de integração para afirmar a mensagem (opcional).

## Critérios de Sucesso

- `GET /api/v1/analistas` retorna apenas ativos, ordenados, com `Id` casável (validado por filtragem real).
- Captação criada por autor na projeção aparece com nome correto e é filtrável pelo `Id` da combo.
- Backfill corrige casáveis (ativos e suspensos), ignora não-casáveis, é idempotente, retorna contagens.
- Endpoint de manutenção sem admin → 403.
- `dotnet test` de integração verde no CI (Docker disponível).
