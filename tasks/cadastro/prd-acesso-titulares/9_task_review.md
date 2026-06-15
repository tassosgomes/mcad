# Task Review — 9.0: Solicitações de Alteração — Lado do Titular

> **PRD:** `tasks/cadastro/prd-acesso-titulares/prd.md`
> **Branch:** `feature/prd-acesso-titulares`
> **Data:** 2026-06-15
> **Validador:** ai-flow-validator (subagent)

---

## Resultado Final

# ✅ APROVADA

---

## 1. Validação Automatizada

| Comando | Resultado | Detalhes |
|---|---|---|
| `dotnet build Cadastro.sln` | ✅ PASS | 0 erros, 2 warnings (NU1902 OpenTelemetry — pré-existentes, não introduzidos por esta task) |
| `dotnet test 5-Tests/Cadastro.UnitTests` | ✅ PASS | 345 testes passaram (0 regressões vs baseline) |
| `dotnet test --filter "AbrirSolicitacaoCommandHandlerTests\|ListarMinhasSolicitacoesQueryHandlerTests"` | ✅ PASS | 26 testes novos (13 + 8 na própria task + 5 InlineData teóricos dentro do assembly) executados com sucesso |

Diretório de execução: `services/cadastro-api`.

---

## 2. Revisão Técnica

### 2.1 Aceitação dos Requisitos Funcionais

| RF | Descrição | Status | Evidência |
|---|---|---|---|
| RF-14 | Abrir solicitação com campo, valor pretendido, justificativa | ✅ | `AbrirSolicitacaoCommand(Guid TitularId, string Campo, string ValorPretendido, string Justificativa)`. Validator exige `Campo` no enum válido, `ValorPretendido` obrigatório, `Justificativa` mín. 10 / máx. 2000 chars. |
| RF-15 | Solicitação nasce `SOLICITADA` | ✅ | `SolicitacaoAlteracao.Criar` força `Status = StatusSolicitacao.Solicitada` (`SolicitacaoAlteracao.cs:70`); testado por `HandleAsync_ComCommandValido_DeveCriarSolicitacaoNoStatusSolicitada`. |
| RF-17 | Titular vê status, isolado por `titularId` | ✅ | `ListarMinhasSolicitacoesQuery` recebe `TitularId` do `ICurrentTitular` no endpoint (`PortalEndpoints.cs:297`); handler repassa ao `SolicitacaoFiltro.TitularId`; testado com captura de filtro (`ListarMinhasSolicitacoesQueryHandlerTests.cs:60-87`). |
| RF-20 | Associação não pode ser removida — destino obrigatório | ✅ | Defense in depth: validator rejeita `ValorPretendido` vazio/não-GUID quando `Campo == ASSOCIACAO` (`AbrirSolicitacaoCommandValidator.cs:40-44`) **e** domínio revalida em `SolicitacaoAlteracao.Criar` (`SolicitacaoAlteracao.cs:55-56` → `DomainException`). Testado por `HandleAsync_ComAssociacaoESemDestino_DeveLancarDomainExceptionRF20`. |
| RF-21 | `exigeAvisoJanela` `true` quando `Campo == ASSOCIACAO` | ✅ | `SolicitacaoResponse.ExigeAvisoJanela` derivado de `s.Campo == CampoSolicitacao.Associacao` (`AbrirSolicitacaoCommandHandler.cs:103`); coberto por `[Theory]` para `NOME`/`CAE_IPI`/`CATEGORIA` (false) e caso `ASSOCIACAO` (true). |

### 2.2 Conformidade Arquitetural e Padrões

| Padrão | Status | Observação |
|---|---|---|
| Clean Architecture (Application não referencia Infra) | ✅ | `Cadastro.Application.csproj` referencia apenas `Cadastro.Domain`. Grep por `using Cadastro.Infra` em `2-Application/` retorna 0 ocorrências. |
| CQRS nativo (`ICommand`/`ICommandHandler`, `IQuery`/`IQueryHandler`) | ✅ | `AbrirSolicitacaoCommand : ICommand<SolicitacaoResponse>`; `AbrirSolicitacaoCommandHandler : ICommandHandler<,>`; `ListarMinhasSolicitacoesQuery : IQuery<MinhasSolicitacoesResponse>`; `ListarMinhasSolicitacoesQueryHandler : IQueryHandler<,>`. |
| Isolamento — `titularId` sempre de `ICurrentTitular` | ✅ | Ambos endpoints (`POST`/`GET /solicitacoes-alteracao`) chamam `currentTitular.IsAutenticado` + extraem `TitularId` do token; `AbrirSolicitacaoRequest` não contém `TitularId`. |
| FluentValidation no validator, `DomainException` na entidade | ✅ | Validator cuida de formato; invariante RF-20 fica no domínio (fonte única de verdade). |
| Endpoints checam `ICurrentTitular.IsAutenticado` | ✅ | `if (!currentTitular.IsAutenticado || currentTitular.TitularId == Guid.Empty) return Results.Unauthorized();` em ambos endpoints. |
| `PaginationResponse` não-genérico | ✅ | Usa `Cadastro.Application.Common.Responses.PaginationResponse` compartilhado (record com `Page/Size/Total/TotalPages`). |
| `AsNoTracking` em leituras | ✅ (intenção) | Handler documenta "AsNoTracking — somente leitura" para a carga do titular; a aplicação efetiva fica no repositório (fora do escopo da task). `ListarAsync` do repo é a fonte da paginação — sem carregamento integral em memória. |
| Registro no DI via Scrutor + `AddValidatorsFromAssemblyContaining` | ✅ | Tanto handler quanto validator são auto-registrados (`Program.cs:139-151`). |
| Mapeamento de exceptions (RFC 7807) | ✅ | `GlobalExceptionHandler`: `DomainException`→422, `ValidationException`→400, `NotFoundException`→404. |

### 2.3 Segurança

- ✅ `titularId` **nunca** vem do body/query — só do JWT via `ICurrentTitular`.
- ✅ Nenhum dado sensível (CPF/CNPJ/senha) é exposto em `SolicitacaoResponse`. `ValorAtual`/`ValorPretendido` para `ASSOCIACAO` é GUID; para `NOME`/`CAE_IPI`/`CATEGORIA` são dados não-sensíveis controlados pelo próprio titular.
- ✅ `ILogger` com `BeginScope("{TitularId}", ...)` — nunca loga documento/senha (conforme techspec).
- ✅ `Results.Created(.../{result.Id})` segue padrão REST sem vazar estado interno.

### 2.4 Cobertura de Testes

**`AbrirSolicitacaoCommandHandlerTests` (13 testes):**
- RF-15 — criação com status `SOLICITADA`.
- Captura de `ValorAtual` para os 4 campos (`NOME`, `CAE_IPI`, `ASSOCIACAO`, `CATEGORIA`), inclusive `CAE_IPI` nulo → string vazia.
- RF-20 — `ASSOCIACAO` sem destino → `DomainException`; persistência não chamada.
- RF-21 — `ExigeAvisoJanela` true/false por campo (`[Theory]`).
- RF-14 — validator falha não persiste; campo inválido; justificativa curta; `TitularId == Guid.Empty`.
- Titular inexistente → `NotFoundException`.

**`ListarMinhasSolicitacoesQueryHandlerTests` (8 testes):**
- RF-17 — `TitularId` do token repassado ao filtro do repositório (captura via callback).
- Defaults de paginação (`page=1`, `size=20`).
- Filtro por `Status` (`SOLICITADA`/`APROVADA`/`REJEITADA` via `[Theory]`); status nulo; status inválido → fallback sem filtro.
- Mapeamento completo de response (status, campo, `exigeAvisoJanela`, `decididaEm`, `justificativaRejeicao`).
- Cálculo de `TotalPages` (ceil) e lista vazia.

### 2.5 Observações (não-bloqueantes)

1. **`CapturarValorAtual` para `CAE_IPI`** usa `titular.CaeIpi?.Valor` (ex.: `"1234567"`) em vez do `?.Formatado` sugerido no task file. Decisão legítima — testes confirmam o comportamento e o `Valor` é canônico para auditoria.
2. **`CATEGORIA`** mapeia para `titular.Tipo.ToString().ToUpperInvariant()` (PF/PJ). Documentado no handler ("Categoria não existe como campo próprio no Titular; usa Tipo"). Interpretação razoável dado o modelo atual.
3. **`ParseStatus`** converte string desconhecida em `null` (sem filtro) em vez de lançar — fallback defensivo documentado e testado.
4. **Sem evento outbox para abertura de solicitação** — conforme techspec, o evento `cadastro.solicitacao.*` não está definido (apenas `cadastro.ocorrencia.*` e `cadastro.titular.contato.atualizado`). O handler explicita essa decisão em comentário. Decisão correta.

Nenhuma das observações acima compromete a aceitação da task.

---

## 3. Arquivos Revisados

| Arquivo | Tipo | Veredito |
|---|---|---|
| `2-Application/Cadastro.Application/Portal/Commands/AbrirSolicitacaoCommand.cs` | Novo | ✅ |
| `2-Application/Cadastro.Application/Portal/Commands/AbrirSolicitacaoCommandValidator.cs` | Novo | ✅ |
| `2-Application/Cadastro.Application/Portal/Commands/AbrirSolicitacaoCommandHandler.cs` | Novo | ✅ |
| `2-Application/Cadastro.Application/Portal/Queries/ListarMinhasSolicitacoesQuery.cs` | Novo | ✅ |
| `2-Application/Cadastro.Application/Portal/Queries/ListarMinhasSolicitacoesQueryHandler.cs` | Novo | ✅ |
| `2-Application/Cadastro.Application/Portal/Responses/SolicitacaoResponse.cs` | Novo | ✅ |
| `2-Application/Cadastro.Application/Portal/Responses/MinhasSolicitacoesResponse.cs` | Novo | ✅ |
| `1-Services/Cadastro.API/Endpoints/PortalEndpoints.cs` | Modificado | ✅ |
| `5-Tests/Cadastro.UnitTests/Portal/AbrirSolicitacaoCommandHandlerTests.cs` | Novo | ✅ |
| `5-Tests/Cadastro.UnitTests/Portal/ListarMinhasSolicitacoesQueryHandlerTests.cs` | Novo | ✅ |

---

## 4. Recomendação

**APROVADA** — todos os critérios de aceite (RF-14, RF-15, RF-17, RF-20, RF-21) estão implementados e testados. Conformidade arquitetural (Clean Architecture, CQRS, isolamento via `ICurrentTitular`) e segurança (anti-tampering, sem leak de dados sensíveis) verificadas. Build com 0 erros; 345 testes unitários (26 novos) passam sem regressões. Pronta para desbloquear tasks 12.0 e 14.0.
