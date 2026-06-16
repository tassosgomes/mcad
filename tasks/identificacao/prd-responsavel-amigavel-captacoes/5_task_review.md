# Revisão — Tarefa 5.0: F2 — Resolução do nome do responsável no cadastro

**Status:** ✅ **APROVADO**

**Data:** 2026-06-16  
**Nível de validação:** standard  
**Risco:** medium  

---

## 1. Resultados de Build e Testes

| Verificação | Resultado |
|---|---|
| `dotnet build` | ✅ 0 erros, 3 warnings (pré-existentes: OpenTelemetry e EF Core version conflict) |
| Unit tests (`Identificacao.Tests`) | ✅ 152 passaram, 0 falharam |
| Integration tests (`Identificacao.IntegrationTests`) | ⚠️ 47 passaram, 1 falhou (**pré-existente**: `IdentificacaoPermissions_Catalog_HasExpectedShape` — espera 20 permissões, encontrou 21 devido à nova permissão `analista:listar` da task 1.0/3.0) |

---

## 2. Verificação de Subtarefas

| Subtarefa | Status | Evidência |
|---|---|---|
| 5.1 — `GetAnalistaSubject()` + rename `GetAnalistaNome` → `GetAnalistaNomeClaim` | ✅ | `UserContextExtensions.cs:15-24` |
| 5.2 — Novo shape de `CriarCaptacaoCommand` + validator | ✅ | `CriarCaptacaoCommand.cs:7-14`; validator valida `AnalistaSubject` com `NotEmpty()`, `AnalistaNomeClaim` sem `NotEmpty` |
| 5.3 — Handler injeta `IUsuarioIdentidadeRepository` com 3-layer resolution | ✅ | `CriarCaptacaoCommandHandler.cs:16,40` — `usuario?.NomeExibicao ?? cmd.AnalistaNomeClaim ?? "Desconhecido"` |
| 5.4 — Endpoint POST `/` usa novos métodos | ✅ | `CaptacaoEndpoints.cs:57-63` — `GetAnalistaSubject()` + `GetAnalistaNomeClaim()`; `CriarCaptacaoRequest` inalterado |
| 5.5 — Todos os testes atualizados para nova assinatura | ✅ | 6 instâncias de `new CriarCaptacaoCommand(` com 6 params em `CriarCaptacaoCommandHandlerTests.cs`; 0 referências a `GetAnalistaNome` (sem `Claim`) |
| 5.6 — 3 cenários de teste do handler | ✅ | (a) `Handle_ProjecaoEncontrada_UsaNomeExibicao`, (b) `Handle_SemProjecaoComClaim_UsaClaim`, (c) `Handle_SemProjecaoSemClaim_UsaDesconhecido` |
| 5.7 — Build + unitários verdes | ✅ | Build 0 erros; 152 unit tests passaram |

---

## 3. Conformidade com PRD

| RF | Descrição | Status | Evidência |
|---|---|---|---|
| RF-8 | Responsável automático (usuário logado, sem campo no formulário) | ✅ | `CriarCaptacaoRequest` mantém `{ RubricaId, Periodo, UsuarioDeMusica }` sem campo de responsável |
| RF-9 | Nome resolvido da projeção pelo identificador do autor | ✅ | Handler chama `_usuarioRepo.BuscarPorSubjectAsync(cmd.AnalistaSubject, ct)` e usa `NomeExibicao` |
| RF-10 | Fallback: projeção → token → "Desconhecido" (só último caso) | ✅ | `usuario?.NomeExibicao ?? cmd.AnalistaNomeClaim ?? "Desconhecido"` |
| RF-11 | Coluna "Responsável" exibe nome resolvido para novas captações | ✅ | Nome resolvido e persistido na criação |

---

## 4. Conformidade com Techspec

| Item da Techspec | Status | Evidência |
|---|---|---|
| `GetAnalistaSubject()` retorna `sub` | ✅ | `UserContextExtensions.cs:15-19` |
| `GetAnalistaNomeClaim()` retorna `string?` (name ?? username ?? null) | ✅ | `UserContextExtensions.cs:21-24` |
| Handler: `(await repo.BuscarPorSubjectAsync(subject))?.NomeExibicao ?? cmd.AnalistaNomeClaim ?? "Desconhecido"` | ✅ | `CriarCaptacaoCommandHandler.cs:39-40` — idêntico |
| Endpoint monta command com `AnalistaId`, `AnalistaSubject`, `AnalistaNomeClaim` | ✅ | `CaptacaoEndpoints.cs:57-63` |
| "Desconhecido" apenas como último recurso | ✅ | Confirmado nos 3 cenários de teste |
| Sem mudança de contrato HTTP | ✅ | `CriarCaptacaoRequest` inalterado |
| CancelamentoEndpoints atualizado | ✅ | `CancelamentoEndpoints.cs:36` — `GetAnalistaNomeClaim() ?? "Desconhecido"` |

---

## 5. Observações

1. **Log opcional** — A task menciona opcionalmente um `logger.LogDebug(...)` ao cair em `"Desconhecido"`. Não implementado; aceitável (era opcional).
2. **CancelarRolCommand** — Mantém `AnalistaNome` como `string` (não nullable). O endpoint já cobre com `?? "Desconhecido"`. Fora do escopo da task 5.
3. **Teste de integração falhando** — `IdentificacaoPermissions_Catalog_HasExpectedShape` é pré-existente à task 5 (causado pela nova permissão `analista:listar`). Não é regressão.

---

## 6. Veredito Final

**APROVADO.** A implementação atende todos os requisitos da task 5.0, PRD (RF-8 a RF-11) e techspec. Build compila sem erros. 152 testes unitários passam sem falhas. As 3 camadas de resolução do nome estão corretamente implementadas e cobertas por testes. Nenhuma referência obsoleta a `GetAnalistaNome` (sem `Claim`) permanece no código. O contrato HTTP externo está preservado.
