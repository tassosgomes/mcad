# Review — Tarefa 2.0: Entidades de Domínio do Portal e State Machines

> **Validator:** ai-flow-validator (worker subagent)
> **Data:** 2026-06-14
> **Branch:** feature/prd-acesso-titulares
> **Base:** 2d16aab (Task 1.0 — VOs)

---

## 1. Resultado da Validação Automatizada

| Etapa | Comando | Resultado |
|---|---|---|
| Build | `dotnet build services/cadastro-api/Cadastro.sln` | **PASS** — 0 erros, 2 warnings (ambas pré-existentes `NU1902` OpenTelemetry, não introduzidas por esta task) |
| Testes unitários (full) | `dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests` | **PASS** — 249 passed / 0 failed (baseline 209 + 40 novos) |
| Testes das novas entidades (filtro) | `dotnet test ... --filter "FullyQualifiedName~CredencialTitularTests\|OcorrenciaTests\|SolicitacaoAlteracaoTests\|TitularAtualizarContatoTests"` | **PASS** — 40 passed / 0 failed |
| Testes de integração (Testcontainers) | — | **Não executados** (fora de escopo: task 3.0) |
| Grep por referências EF Core no Domain | `DbContext\|OwnsOne\|OwnsMany\|HasConversion\|IEntityTypeConfiguration` | **OK** — zero ocorrências nos arquivos novos (apenas um comentário pré-existente em `IOutboxEventWriter.cs`). Nenhum vazamento de escopo da task 3.0. |

### Comandos executados

```bash
dotnet build services/cadastro-api/Cadastro.sln
dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests
dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests \
  --filter "FullyQualifiedName~CredencialTitularTests|FullyQualifiedName~OcorrenciaTests|FullyQualifiedName~SolicitacaoAlteracaoTests|FullyQualifiedName~TitularAtualizarContatoTests"
```

### Saídas-chave

```
Build succeeded. 0 Error(s). 2 Warning(s)  # NU1902 pré-existentes
Passed! - Failed: 0, Passed: 249, Skipped: 0, Total: 249
Passed! - Failed: 0, Passed:  40, Skipped: 0, Total:  40  # novas entidades
```

---

## 2. Inventário de Arquivos (16 novos + 2 alterados)

**Novos (Domain):**
- `Enums/TipoOcorrencia.cs`, `Enums/StatusOcorrencia.cs`, `Enums/CampoSolicitacao.cs`, `Enums/StatusSolicitacao.cs`
- `Entities/CredencialTitular.cs`, `Entities/Ocorrencia.cs`, `Entities/SolicitacaoAlteracao.cs`
- `Interfaces/ICredencialTitularRepository.cs`, `Interfaces/IOcorrenciaRepository.cs`, `Interfaces/ISolicitacaoAlteracaoRepository.cs`
- `Interfaces/OcorrenciaFiltro.cs`, `Interfaces/SolicitacaoFiltro.cs`

**Novos (Tests):**
- `Entities/CredencialTitularTests.cs`, `Entities/OcorrenciaTests.cs`, `Entities/SolicitacaoAlteracaoTests.cs`
- `Titulares/TitularAtualizarContatoTests.cs`

**Alterados:**
- `Entities/Titular.cs` (+ `Email?`, `Endereco?`, `IReadOnlyList<TelefoneTitular> Telefones`, `AtualizarContato`)
- `4-Infra/Cadastro.Infra/Events/EventTypes.cs` (+ 3 constantes)

`Cadastro.Domain.csproj` permanece com **zero referências de pacote** — Domain livre de dependências externas (Clean Architecture preservada).

---

## 3. Resultado da Revisão Técnica

### 3.1 Subtarefas 2.1–2.11 — conformidade

| Subtarefa | Status | Evidência |
|---|---|---|
| 2.1 `TipoOcorrencia` (4 valores) | ✅ | `TitularidadeDivergente, FonogramaIncorreto, DadoCadastral, ObraAusente` |
| 2.2 `StatusOcorrencia` (4 valores) | ✅ | `Aberta, EmAnalise, Resolvida, Cancelada` |
| 2.3 `CampoSolicitacao` (4 valores) | ✅ | `Nome, CaeIpi, Associacao, Categoria` |
| 2.4 `StatusSolicitacao` (3 valores) | ✅ | `Solicitada, Aprovada, Rejeitada` |
| 2.5 `CredencialTitular` (lockout exponencial) | ✅ | `Criar`, `IncrementarFalha`, `ResetarFalhas`, `EstaBloqueado`. Durações 1/5/15min por ciclo (`DuracaoLockout` switch). Ver nota 3.6 sobre `VerificarSenhaEIncrementarFalha`. |
| 2.6 `Ocorrencia` (state machine) | ✅ | `ABERTA→EM_ANALISE→RESOLVIDA`; `ABERTA|EM_ANALISE→CANCELADA`. Transições inválidas → `DomainException($"Transição inválida: {Status} → {novoStatus}")` (RF-37) |
| 2.7 `SolicitacaoAlteracao` (RF-20) | ✅ | `Criar` valida `Campo==ASSOCIACAO && IsNullOrWhiteSpace(ValorPretendido)` → `DomainException("O vínculo de associação só pode ser alterado, nunca removido")`. Mensagem exata conforme task. |
| 2.8 Extensão `Titular` + `AtualizarContato` | ✅ | `Email?`, `Endereco?`, `IReadOnlyList<TelefoneTitular> Telefones`. `AtualizarContato` substitui coleção (`.ToList()`), impõe cap 5, atualiza `AtualizadoEm`, lança `DomainException` se >5. |
| 2.9 Interfaces e Filtros | ✅ | `ICredencialTitularRepository` (ByTitularId/ByDocumento/Add/Save), `IOcorrenciaRepository` e `ISolicitacaoAlteracaoRepository` (Listar→(IEnumerable,int)/GetById/Add/Update/Save). `OcorrenciaFiltro`, `SolicitacaoFiltro` como records espelhando `TitularFiltro`. |
| 2.10 `EventTypes.cs` (+3 constantes) | ✅ | `TitularContatoAtualizado = "cadastro.titular.contato.atualizado"`, `OcorrenciaAberta = "cadastro.ocorrencia.aberta"`, `OcorrenciaResolvida = "cadastro.ocorrencia.resolvida"`. Routing keys exatas conforme Tech Spec. |
| 2.11 Testes unitários | ✅ | 4 arquivos, 40 testes. Ver seção 3.5. |

### 3.2 Critérios de Sucesso (task file)

- ✅ 3 entidades compilam com state machines rejeitando transições inválidas via `DomainException`
- ✅ `Titular.AtualizarContato` substitui coleção e impõe cap 5
- ✅ RF-20 enforced no domínio (associação nunca removida)
- ✅ `EventTypes.cs` contém as 3 novas constantes
- ✅ `dotnet test 5-Tests/Cadastro.UnitTests` passa

### 3.3 Conformidade PRD / Tech Spec

| Requisito | Conformidade | Observação |
|---|---|---|
| RF-04 (senha só hash) | ✅ | `CredencialTitular.Criar(Guid, string senhaHash)` recebe o hash pré-computado. Domínio nunca vê senha em texto plano. Hash BCrypt é responsabilidade da camada de aplicação (conforme Tech Spec — fluxo de login). |
| RF-14 a RF-21 (solicitações) | ✅ | RF-14/15/16/18/19/20 cobertos pela entidade. RF-17 (listagem titular) e RF-21 (aviso UI) são escopo de aplicação/frontend. |
| RF-27 a RF-39 (ocorrências) | ✅ | RF-27/28/34/35/36/37 cobertos. RF-29/30/31 (listagem/isolamento), RF-32/39 (eventos outbox) são escopo de aplicação/infra. RF-38 (auditoria autor/data/motivo) é atendida pelo sistema de auditoria two-tier existente (não por campos na entidade), conforme Tech Spec. |
| Modelos de Dados (Tech Spec) | ✅ | Todas as colunas das 3 entidades + extensão de Titular correspondem ao Tech Spec. |
| Interfaces Principais (Tech Spec) | ✅ | Assinaturas de `ICredencialTitularRepository`, `IOcorrenciaRepository`, `ISolicitacaoAlteracaoRepository` idênticas ao Tech Spec. |
| Eventos (Tech Spec) | ✅ | 3 constantes com routing keys exatas. |

### 3.4 Conformidade com Skills .NET

- **dotnet-architecture**: ✅ Entidades em `3-Domain/Entities`, interfaces em `3-Domain/Interfaces`, zero dependências externas no `Cadastro.Domain.csproj`. Padrão de entidade respeitado: private setters, construtor privado para EF, factory `Criar` estático, `Id = Guid.NewGuid()`, `CriadoEm/AtualizadoEm = DateTime.UtcNow`. `DomainException` para invariantes (mapeada a HTTP 422 pelo `GlobalExceptionHandler`).
- **dotnet-code-quality**: ✅ PascalCase para classes/métodos/props; camelCase para parâmetros; underscore prefix para consts privadas (`_logger` style → aqui `MaxTelefones`, `LimiteFalhasPorCiclo` são `private const` sem underscore, mas a skill cita underscore para *campos readonly de instância*; consts em PascalCase conforme exemplo `MaxRetryAttempts` da skill). Métodos < 50 linhas; classes < 300 linhas; métodos iniciam com verbo; sem flag params; constantes para magic numbers. Português ubiquituoso preservado (`Titular`, `Ocorrencia`, `Criar`, `AtualizarContato`).
- **dotnet-testing**: ✅ xUnit + AwesomeAssertions + Moq; padrão AAA; naming `MethodName_Condition_ExpectedBehavior` (`Criar_ComAssociacaoEVazio_DeveLancarDomainExceptionRF20`); `[Theory]`/`[InlineData]` para casos parametrizados; asserções significativas (`BeCloseTo` para timestamps, `WithMessage` para exceções, `BeAfter` para monotonicidade de `AtualizadoEm`).

### 3.5 Qualidade dos Testes (40 testes)

| Arquivo | Testes | Cobertura notável |
|---|---|---|
| `CredencialTitularTests` | 10 (7 Fact + 1 Theory×3) | `Criar` (id vazio, hash vazio ×3); lockout em 5/10/15 falhas com asserção `BeCloseTo` nas durações; `ResetarFalhas` zera e limpa; `EstaBloqueado` com data no passado → false (edge case via reflection — apropriado para testar o getter computado sem depender de clock). |
| `OcorrenciaTests` | 11 Fact | `Criar` nasce `Aberta`; todas transições válidas; todas inválidas (`AssumirAnalise` de `EmAnalise`, `Resolver` de `Aberta`, `Cancelar` de `Resolvida`, `Resolver` de `Resolvida`); validação de parecer/justificativa vazios. |
| `SolicitacaoAlteracaoTests` | 11 (8 Fact + 1 Theory×3) | RF-20 (`ASSOCIACAO` + vazio ×3 casos); `Aprovar`/`Rejeitar` transitam; `Aprovar` de `Aprovada` e de `Rejeitada` → exceção; justificativa vazia em `Rejeitar`. |
| `TitularAtualizarContatoTests` | 7 Fact | Substituição integral da coleção (não append); lista vazia aceita; cap 5 (>5 rejeita, exatamente 5 aceita — boundary); `AtualizadoEm` avança; estado inicial vazio. |

As asserções cobrem state, timestamps, mensagens de exceção e boundary conditions. Não há testes triviais.

### 3.6 Decisão de Design: separação `IncrementarFalha` vs `VerificarSenhaEIncrementarFalha`

A task 2.5 mencionava `VerificarSenhaEIncrementarFalha(string senha, string senhaHashAtual)`. O implementer optou por apenas `IncrementarFalha()` no domínio, deixando a verificação BCrypt para o handler (conforme fluxo explícito da Tech Spec, seção "Fluxo de Login"). **Esta é uma decisão arquitetural superior** — mantém o domínio livre de dependência de algoritmos de hash e alinha com Clean Architecture. **Aceita.**

### 3.7 Lockout Exponencial — correção

```csharp
TentativasFalhas++;
if (TentativasFalhas % 5 != 0) return;          // só bloqueia em múltiplos de 5
var ciclo = TentativasFalhas / 5;                // 5→1, 10→2, 15→3
BloqueadoAte = now + DuracaoLockout(ciclo);      // 1min, 5min, 15min
```

- `EstaBloqueado => BloqueadoAte.HasValue && BloqueadoAte.Value > DateTime.UtcNow` (strict `>`: quando igual a agora, bloqueio expirou — correto).
- `ResetarFalhas`: zera `TentativasFalhas` e anula `BloqueadoAte` (reinicia ciclo na próxima falha) — comportamento sensato para login bem-sucedido.
- Após 15 falhas (ciclo 3+), todas as próximas bloqueios adicionais (20, 25, ...) ficam em 15min (teto). Razoável para PoC.

### 3.8 Segurança

- `SenhaHash` é a única representação da senha na entidade — sem campo de texto plano, sem método `Verificar` no domínio (BCrypt fica no handler, conforme Tech Spec).
- Nenhum `ILogger` ou `Console` nas entidades — nenhum risco de log de segredo.
- Mensagens de `DomainException` não vazam dados sensíveis.
- RF-04 atendido por contrato: `Criar` exige `senhaHash`.

---

## 4. Issues Encontradas

### 4.1 Observação Não-Bloqueante: `[NotMapped]` em `Titular.cs` (desvio temporal documentado)

**Localização:** `3-Domain/Cadastro.Domain/Entities/Titular.cs:131,135,142`

```csharp
[NotMapped] public Email? Email { get; private set; }
[NotMapped] public Endereco? Endereco { get; private set; }
[NotMapped] public IReadOnlyList<TelefoneTitular> Telefones { get; private set; } = [];
```

**Contexto:** O implementer adicionou `[NotMapped]` (de `System.ComponentModel.DataAnnotations.Schema`, BCL — sem novo pacote NuGet) às 3 novas propriedades de `Titular` como ponte transitória, pois o EF Core não consegue descobrir mapeamento para VOs record (`Email`, `Endereco`) e coleções (`IReadOnlyList<TelefoneTitular>`) sem configuração Fluent API (`OwnsOne`/`OwnsMany`), que é escopo explícito da **task 3.0**.

**Avaliação:**

| Critério | Veredito |
|---|---|
| Vazamento de escopo da task 3.0? | **Não** — `[NotMapped]` é diretiva de não-mapeamento (sinal contrário a config EF). Nenhum `OwnsOne`/`OwnsMany`/`IEntityTypeConfiguration` introduzido (confirmado por grep). |
| Violação de skill arquitetural? | **Marginal** — a convenção do projeto é Fluent API puro (sem data annotations). `[NotMapped]` é semanticamente uma diretiva de persistência na camada de domínio. Contudo, é BCL (não `Microsoft.EntityFrameworkCore`), então `Cadastro.Domain.csproj` permanece com zero dependências — Clean Architecture estrutural preservada. |
| Esconde bug de mapeamento? | **Não** — os testes unitários verificam comportamento de domínio independentemente de persistência. Os testes de integração da task 3.0 detectarão imediatamente qualquer `OwnsOne`/`OwnsMany` ausente (dados não persistiriam). O `[NotMapped]` é o estado correto e intencional enquanto não há config EF. |
| Alternativa melhor? | Remover as propriedades agora e adicioná-las na task 3.0 quebraria o método `AtualizarContato` e os testes (escopo da task 2.0). Não há alternativa que preserve o escopo semântico da task 2.0. |

**Decisão:** Aceitável como estado transitório. **Não bloqueia a task 2.0.** Recomendação acionável para a **task 3.0**: o validador da task 3.0 deve verificar que os 3 `[NotMapped]` são removidos e substituídos por `OwnsOne(t => t.Email, ...)`, `OwnsOne(t => t.Endereco, ...)` e `OwnsMany(t => t.Telefones, ...)` em `TitularConfiguration`, e que o `using System.ComponentModel.DataAnnotations.Schema;` seja removido do topo de `Titular.cs`.

### 4.2 Nenhum outro issue

- Sem bugs lógicos.
- Sem transições de state machine faltantes ou incorretas.
- Sem regressões (249 testes passam vs baseline 209).
- Sem overengineering.
- Sem vazamento de EF Core para o domínio.
- Sem problemas de segurança.

---

## 5. Recomendação Final

# ✅ APROVADA

A task 2.0 atende integralmente às subtarefas 2.1–2.11, aos critérios de sucesso, aos requisitos do PRD (RF-04, RF-14–RF-21, RF-27–RF-39 no escopo de domínio), aos modelos de dados/interfaces/eventos da Tech Spec, e aos padrões das skills `.NET` (arquitetura, qualidade de código, testes). Build limpo (0 erros), 249 testes passando (40 novos), zero regressões.

A observação sobre `[NotMapped]` é **não-bloqueante** (aceitável como ponte transitória até a task 3.0) e foi registrada com recomendação acionável para o validador da task 3.0.

---

## Telemetria

Registrada em `docs/ai-dev/quality-ledger.md`.
