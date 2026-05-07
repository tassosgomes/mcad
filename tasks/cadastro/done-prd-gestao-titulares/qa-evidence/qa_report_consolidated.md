# Relatório QA Consolidado — F02: Gestão de Titulares

**Sessao:** 3a re-execução — API PID 10137, binário atualizado (2026-04-08)
**Data:** 2026-04-08
**PRD:** `tasks/cadastro/prd-gestao-titulares/prd.md`
**Techspec:** `tasks/cadastro/prd-gestao-titulares/techspec.md`
**Ambiente:** `http://localhost:5001/api/v1`
**Auth:** Keycloak JWT (analista.teste / consultor.teste)
**Banco:** PostgreSQL — schema `cadastro` em `db.tasso.dev.br`

---

## Resultado Geral

| Task | User Story | TCs | PASS | FAIL | Status |
|------|-----------|-----|------|------|--------|
| qa_task_01 | HU-01: Cadastrar PF | 7 | 7 | 0 | **PASS** |
| qa_task_02 | HU-02: Cadastrar PJ (CNPJ alfanumérico) | 7 | 7 | 0 | **PASS** |
| qa_task_03 | HU-03: Listar/Filtrar Titulares | 8 | 8 | 0 | **PASS** |
| qa_task_04 | HU-04: Editar Titular | 7 | 7 | 0 | **PASS** |
| qa_task_05 | HU-05: Visualizar Titular | 5 | 5 | 0 | **PASS** |
| qa_task_06 | RF-23/RF-24: Excluir Titular | 5 | 5 | 0 | **PASS** |
| **TOTAL** | | **39** | **39** | **0** | |

**6 de 6 tasks passaram. Taxa de sucesso: 100% (39/39 TCs).**

> TC05-05 aceito pelo PO como comportamento válido (2026-04-08). Todos os 3 bugs identificados foram corrigidos e revalidados.

---

## Status dos Bugs — 3a Revalidação (API PID 10137)

### BUG-04-01 — Alta: Associação não atualizada pelo PUT
**Status: CORRIGIDO**

| Item | Detalhe |
|------|---------|
| Severidade | Alta |
| Status | CORRIGIDO — validado na 3a re-execução |
| Resolução | `AtualizarTitularCommandHandler` usa `GetByIdForUpdateAsync` (EF Core tracking). Entidade rastreada permite que o EF Core detecte e persista a mudança de `AssociacaoId`. |
| Evidência | PUT com SBACEM retorna HTTP 200 e `associacao.sigla: SBACEM`. GET subsequente confirma persistência no banco (`atualizadoEm` reflete o timestamp da edição). |

---

### BUG-04-02 — Baixa: UUID zeros retorna 400 no PUT
**Status: CORRIGIDO**

| Item | Detalhe |
|------|---------|
| Severidade | Baixa |
| Status | CORRIGIDO — validado na 3a re-execução |
| Resolução | Validação de `Guid.Empty` removida do `AtualizarTitularCommandValidator`. O fluxo passa pelo repositório, que retorna 404 quando o ID não existe. |
| Evidência | PUT /titulares/00000000-0000-0000-0000-000000000000 retorna HTTP 404. Comportamento agora consistente com GET e DELETE. |

---

### BUG-05-01 — Baixa: Mensagens 404 em inglês
**Status: CORRIGIDO**

| Item | Detalhe |
|------|---------|
| Severidade | Baixa |
| Status | CORRIGIDO — validado na 3a re-execução |
| Resolução | `NotFoundException.cs` atualizado para gerar mensagem em português: `"Titular com ID '{id}' não foi encontrado"`. |
| Evidência | GET com ID inexistente retorna `detail: "Titular com ID '...' não foi encontrado"` (português). Verificado também no TC04-05 e TC04-06 do PUT. |

---

## Comportamento Aceito pelo Negócio

### TC05-05 — GET com string não-UUID retorna 404 (esperado: 400)

| Item | Detalhe |
|------|---------|
| Severidade | Cosmética |
| Status | **ACEITO** — comportamento atual atende o negócio (decisão PO 2026-04-08) |
| Descrição | GET /titulares/nao-e-uuid retorna HTTP 404 ao invés de 400 |
| Causa | Route constraint `{id:guid}` do ASP.NET Minimal API não rejeita strings não-UUID com 400 — a rota simplesmente não corresponde e resulta em 404 |
| Impacto | Nenhum impacto nas regras de negócio RF-21/RF-22. Sem regressão — comportamento inalterado desde a 1a execução |
| Decisão | **Aceito pelo PO** — comportamento atual é satisfatório para o negócio |

---

## Comportamentos Funcionais Validados

### HU-01 — Cadastrar Titular PF: APROVADO
- Validação CPF módulo 11 funciona (422 para CPF inválido)
- Unicidade CPF funciona (409 com mensagem PT-BR)
- Status default ATIVO confirmado
- Todos os campos obrigatórios validados
- CAE/IPI opcional funciona
- Persistência no banco confirmada

### HU-02 — Cadastrar Titular PJ: APROVADO
- Validação CNPJ alfanumérico (módulo 11, ASCII-48) funciona para 3 CNPJs reais da RFB
- Retrocompatibilidade numérica confirmada
- `documentoFormatado` com separadores corretos para CNPJs alfanuméricos
- Unicidade CNPJ funciona (409 com mensagem PT-BR)

### HU-03 — Listagem e Filtros: APROVADO
- Paginação server-side (page, size, total, totalPages)
- Filtro por nome parcial case-insensitive
- Filtro por documento parcial (inclui alfanumérico)
- Filtro exato por associação
- Filtro exato por status
- Ordenação ASC/DESC por nome (prefixo `-`)
- Consultor pode listar

### HU-04 — Editar Titular: APROVADO
- Nome, nacionalidade, CAE/IPI: atualizáveis
- Status (ATIVO/FALECIDO/TRANSFERINDO): atualizável
- Associação: **atualizável** (BUG-04-01 corrigido)
- Tipo e documento: imutáveis (RF-11)
- 404 para ID inexistente: funciona (RF-22)
- UUID zeros via PUT: retorna 404 (BUG-04-02 corrigido)

### HU-05 — Visualizar Titular: APROVADO
- GET por ID retorna todos os campos obrigatórios (RF-21)
- `documentoFormatado` com formatação CPF correta
- `criadoEm` e `atualizadoEm` presentes
- Consultor pode visualizar (HU-05)
- 404 para ID inexistente: funciona com status HTTP e mensagem em português (RF-22, BUG-05-01 corrigido)
- UUID zeros no GET: retorna 404 com mensagem em português
- String não-UUID retorna 404 (comportamento de routing — cosmético)

### RF-23/RF-24 — Exclusão: APROVADO
- Exclusão sem vínculos retorna 204
- Exclusão com vínculos retorna 409 com mensagem PT-BR
- GET após DELETE confirma remoção do banco
- UUID zeros retorna 404 para DELETE (correto)

---

## Histórico de Execuções

| Execução | Data/Hora | TCs PASS | TCs FAIL | Bugs Ativos |
|----------|-----------|----------|----------|-------------|
| 1a execução | 2026-04-08 AM | 29 | 5 | BUG-04-01, BUG-04-02, BUG-05-01 + outros (resolvidos) |
| 1a re-execução | 2026-04-08 PM | 34 | 5 | BUG-04-01, BUG-04-02 (PUT), BUG-05-01 |
| 2a re-execução | 2026-04-08 PM | 35 | 4 | BUG-04-01, BUG-04-02 (PUT), BUG-05-01 |
| **3a re-execução** | **2026-04-08 ~24:00** | **38** | **1** | TC05-05 (cosmético) |
| **Aceite PO** | **2026-04-08** | **39** | **0** | **Nenhum — TC05-05 aceito pelo PO** |

---

## Evidências

| Task | Relatório Individual |
|------|---------------------|
| qa_task_01 | `qa_task_01_cadastrar_titular_pf/qa_report_task_01.md` |
| qa_task_02 | `qa_task_02_cadastrar_titular_pj/qa_report_task_02.md` |
| qa_task_03 | `qa_task_03_listar_filtrar_titulares/qa_report_task_03.md` |
| qa_task_04 | `qa_task_04_editar_titular/qa_report_task_04.md` |
| qa_task_05 | `qa_task_05_visualizar_titular/qa_report_task_05.md` |
| qa_task_06 | `qa_task_06_excluir_titular/qa_report_task_06.md` |

---

*Relatório gerado pelo QA Orchestrator — 3a Re-execução de 2026-04-08*
