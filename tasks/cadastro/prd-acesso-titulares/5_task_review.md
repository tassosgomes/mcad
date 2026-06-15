# Task 5.0 — Review Report — Auto-cadastro, Login e Alteração de Senha do Titular

> **PRD:** `tasks/cadastro/prd-acesso-titulares/prd.md` (RF-01 a RF-07)
> **Tech Spec:** `tasks/cadastro/prd-acesso-titulares/techspec.md` (*Fluxo de Login*, *Endpoints de API*)
> **Task:** `tasks/cadastro/prd-acesso-titulares/05_task.md`
> **Data:** 2026-06-15
> **Branch:** `feature/prd-acesso-titulares`
> **Recomendação final:** **APROVADA**

---

## 1. Validação Automatizada

| Etapa | Comando | Resultado |
|---|---|---|
| Build | `dotnet build services/cadastro-api/Cadastro.sln` | **PASS** — 7 projetos, 0 erros, 2 warnings pré-existentes (NU1902 OpenTelemetry 1.9.0 vulnerability, não relacionados à task) |
| Unit tests (completos) | `dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests` | **PASS** — 276 passed, 0 failed, 0 skipped (5s) |
| Unit tests (Portal) | `dotnet test ... --filter "FullyQualifiedName~Portal"` | **PASS** — 16 passed, 0 failed (2s) |
| Integração | Não executada (deferida para task 16.0 — exige PostgreSQL/Testcontainers) | — |

**Contagem de testes novos por arquivo (16 total):**
- `AutoCadastroTitularCommandHandlerTests.cs` — 6 testes
- `LoginTitularCommandHandlerTests.cs` — 6 testes
- `AlterarSenhaCommandHandlerTests.cs` — 4 testes

**Regressão:** nenhum teste pré-existente quebrou (baseline 260 + 16 novos = 276).

---

## 2. Comandos Executados

```bash
dotnet build services/cadastro-api/Cadastro.sln
dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests --nologo
dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests --nologo --filter "FullyQualifiedName~Portal"
git status --short
git branch --show-current
```

---

## 3. Revisão Técnica

### 3.1 Subtarefas 5.1–5.10 — Todas atendidas

| Subtarefa | Arquivo(s) | Status |
|---|---|---|
| 5.1 `AutoCadastroTitularCommand` | `Portal/Commands/AutoCadastroTitularCommand.cs` | ✅ `record ... : ICommand<AutoCadastroResponse>` |
| 5.2 `AutoCadastroTitularCommandValidator` | `Portal/Commands/AutoCadastroTitularCommandValidator.cs` | ✅ FluentValidation: Documento NotEmpty, CaeIpi NotEmpty + MaxLength 20, Senha NotEmpty + MinimumLength 8 |
| 5.3 `AutoCadastroTitularCommandHandler` | `Portal/Commands/AutoCadastroTitularCommandHandler.cs` | ✅ Pipeline completo (normaliza → busca → valida CAE → checa duplicidade → BCrypt → persiste) |
| 5.4 `LoginTitularCommand` | `Portal/Commands/LoginTitularCommand.cs` | ✅ `record ... : ICommand<LoginResponse>` |
| 5.5 `LoginTitularCommandHandler` | `Portal/Commands/LoginTitularCommandHandler.cs` | ✅ Fluxo de Login da TechSpec seguido (passos 1–7) |
| 5.6 `AlterarSenhaCommand` | `Portal/Commands/AlterarSenhaCommand.cs` | ✅ `record (Guid TitularId, string SenhaAtual, string NovaSenha)` — ver desvio (a) |
| 5.7 `AlterarSenhaCommandHandler` + Validator | `Portal/Commands/AlterarSenhaCommandHandler.cs`, `AlterarSenhaCommandValidator.cs` | ✅ Carrega por TitularId, BCrypt.Verify, ≥8 chars, NotEqual SenhaAtual, re-hash work factor 12 |
| 5.8 Endpoints + Program.cs | `1-Services/.../Endpoints/PortalAuthEndpoints.cs`, `Program.cs:283` | ✅ `/api/v1/portal` group; POST `/auto-cadastro` e POST `/auth/login` `.AllowAnonymous()`; PUT `/me/senha` `.RequireAuthorization("PortalTitular")`; `MapPortalAuthEndpoints` registrado |
| 5.9 DTOs de resposta | `Portal/Responses/{TitularResumo,AutoCadastroResponse,LoginResponse}.cs` | ✅ Records; nenhum expõe `SenhaHash` ou documento |
| 5.10 Testes unitários | `5-Tests/.../Portal/*.cs` (3 arquivos) | ✅ 16 testes cobrindo sucesso + todas as falhas |

### 3.2 Pontos Críticos de Segurança / RF

#### RF-06 — Mensagem genérica (CRÍTICO) ✅
Todos os caminhos de falha lançam `AutenticacaoTitularException()` (construtor padrão → mensagem fixa `"Credenciais inválidas"` definida em `AutenticacaoTitularException.cs:11`). Verificado em cada handler:

| Handler | Caminho de falha | Exception | Mensagem |
|---|---|---|---|
| `AutoCadastroTitularCommandHandler` | titular == null (RF-02) | `AutenticacaoTitularException()` | `"Credenciais inválidas"` ✅ |
| `AutoCadastroTitularCommandHandler` | CAE divergente (RF-02) | `AutenticacaoTitularException()` | `"Credenciais inválidas"` ✅ |
| `LoginTitularCommandHandler` | DomainException (CPF inválido) — capturada | `AutenticacaoTitularException()` | `"Credenciais inválidas"` ✅ |
| `LoginTitularCommandHandler` | credencial == null | `AutenticacaoTitularException()` | `"Credenciais inválidas"` ✅ |
| `LoginTitularCommandHandler` | `EstaBloqueado` | `AutenticacaoTitularException()` | `"Credenciais inválidas"` ✅ |
| `LoginTitularCommandHandler` | `!BCrypt.Verify(...)` | `AutenticacaoTitularException()` | `"Credenciais inválidas"` ✅ |
| `AlterarSenhaCommandHandler` | credencial == null | `AutenticacaoTitularException()` | `"Credenciais inválidas"` ✅ |
| `AlterarSenhaCommandHandler` | senha atual incorreta | `AutenticacaoTitularException()` | `"Credenciais inválidas"` ✅ |

**Único caminho que difere (intencional):** auto-cadastro com credencial já existente → `ConflictException("Já existe conta para este CPF/CNPJ")` — RF-03. O titular sabe que já tem conta; não revela nada sobre outro titular. ✅

**Distinção de design acertada:** em auto-cadastro, CPF algoritmo-inválido propaga `DomainException` (422) — apropriado para signup (feedback de formato do input do próprio usuário). Em login, a mesma `DomainException` é capturada e convertida em 401 genérico (RF-06) — não revela diferença entre formato inválido e senha errada.

#### RF-03 — Uma conta por CPF/CNPJ ✅
`AutoCadastroTitularCommandHandler:70-75` chama `ByTitularIdAsync(titular.Id)` e lança `ConflictException` se já existe credencial. Teste `HandleAsync_ComCredencialJaExistente_DeveLancarConflictException` confirma.

#### RF-04 — Senha apenas como hash BCrypt ✅
- `AutoCadastroTitularCommandHandler:78` → `BCryptNet.HashPassword(command.Senha, workFactor: 12)`
- `AlterarSenhaCommandHandler:56` → `BCryptNet.HashPassword(command.NovaSenha, workFactor: 12)`
- `CredencialTitular.SenhaHash` é `private set`; nunca exposta em DTOs.
- Testes asseram `BCryptNet.Verify(senha, hash)` e `hash.Should().NotContain(senha)` e `hash.StartsWith("$2")`.

#### RF-05 — Login retorna token + titular ✅
`LoginTitularCommandHandler:108-116` → `token = _tokenService.Gerar(titular)`, retorna `LoginResponse(Token, ExpiraEm, TitularResumo(Id, Nome))`. `ITitularTokenService` injetado; implementação `TitularTokenService` emite JWT HMAC-SHA256 com `sub = titular.Id`, TTL 60min.

#### RF-07 — PUT /me/senha ✅
- `PortalAuthEndpoints.cs:33` → `group.MapPut("/me/senha", ...).RequireAuthorization("PortalTitular")`
- `PortalAuthEndpoints.cs:59-77` → `ICurrentTitular` injetado no endpoint; `TitularId` vem do JWT (NÃO do body). `AlterarSenhaRequest` contém apenas `SenhaAtual` + `NovaSenha` — anti-tampering preservado.
- `AlterarSenhaCommandHandler:48` → `BCryptNet.Verify(command.SenhaAtual, credencial.SenhaHash)` antes de re-hashear.

#### Endpoints — autorização ✅
- `POST /api/v1/portal/auto-cadastro` — `.AllowAnonymous()` ✅
- `POST /api/v1/portal/auth/login` — `.AllowAnonymous()` ✅
- `PUT /api/v1/portal/me/senha` — `.RequireAuthorization("PortalTitular")` ✅
- `MapPortalAuthEndpoints(app)` registrado em `Program.cs:283` ✅
- Route group `/api/v1/portal` com `WithTags("Portal do Titular — Autenticação")` ✅
- Guarda extra no endpoint: checa `currentTitular.IsAutenticado && TitularId != Guid.Empty` antes de construir o command (defesa em profundidade).

#### Lockout ✅
- `CredencialTitular.IncrementarFalha()`: ao atingir múltiplos de 5, seta `BloqueadoAte = now + DuracaoLockout(ciclo)` (1min / 5min / 15min).
- `EstaBloqueado` → `BloqueadoAte.HasValue && BloqueadoAte.Value > DateTime.UtcNow`.
- `LoginTitularCommandHandler:77-81` → bloqueado → 401 genérico (RF-06: titular não sabe que está bloqueado).
- Teste `HandleAsync_NaQuintaFalha_DeveAtivarLockout` confirma lockout ativa exatamente na 5ª falha.
- Teste `HandleAsync_ComCredencialBloqueada_DeveLancarAutenticacaoGenerica` confirma mensagem idêntica.

#### LGPD — logs e DTOs ✅
- Todos os log scopes usam `{ TitularId }` apenas — `LoginTitularCommandHandler:74`, `AutoCadastroTitularCommandHandler:64,85`, `AlterarSenhaCommandHandler:45`. Documento e senha nunca aparecem em logs.
- Mensagens de log são operacionais ("senha incorreta", "CAE divergente") — visíveis apenas a operadores, não retornadas ao cliente.
- `TitularResumo` contém apenas `Id` + `Nome`; `LoginResponse`/`AutoCadastroResponse` nunca incluem `SenhaHash` nem documento.

#### CQRS — convenções ✅
- Handlers implementam `ICommandHandler<TCommand, TResult>` (interface existente).
- Commands são `record` imutáveis implementando `ICommand<TResult>`.
- Validators usam `AbstractValidator<T>` do FluentValidation.
- Despachados via `IDispatcher.SendAsync` (valida automaticamente via `Dispatcher.ValidateCommandAsync`).
- Repositories seguem padrões existentes (AsNoTracking para leitura, Update() para re-anexar mutações).
- DI do handler e validator automático via Scrutor em `Program.cs:144-151`.

#### Regressão ✅
- 260 testes pré-existentes + 16 novos = 276 — zero falhas.
- Scheme Keycloak permanece default (`JwtBearerDefaults.AuthenticationScheme`); scheme "Titular" adicionado em paralelo; `FallbackPolicy` e `DefaultPolicy` preservadas — endpoints internos continuam exigindo Keycloak.
- `ICredencialTitularRepository` e `ITitularRepository` somente tiveram métodos ADICIONADOS (`Update`, `GetByDocumentoAsync`) — nada quebrado.

### 3.3 Desvios avaliados (flags do implementer)

#### (a) `AlterarSenhaCommand : ICommand<bool>` em vez de `ICommand<NoContent>` ✅ ACEITÁVEL
Verificado: não existe tipo `NoContent` no projeto (busca `**/NoContent*.cs` retornou vazio). Os commands sem payload existentes usam `ICommand<bool>`:
- `ExcluirTitularCommand.cs:9` → `public record ExcluirTitularCommand(Guid Id) : ICommand<bool>;`
- `RemoverAnexoCommand.cs:6-10` → `public record RemoverAnexoCommand(...) : ICommand<bool>;`

O implementer seguiu a convenção real do codebase. O texto da task (`ICommand<NoContent>`) estava divergente da convenção — desvio justificado e documentado.

#### (b) `ICurrentTitular` injetado no endpoint; `TitularId` flui via command ✅ ACEITÁVEL (observação menor)
- `ICurrentTitular` está em `Cadastro.API.Authorization` (camada 1-Services), não em Application.
- O endpoint extrai `currentTitular.TitularId` do JWT e passa no command — anti-tampering preservado (`AlterarSenhaRequest` só tem `SenhaAtual` + `NovaSenha`).
- Subtarefa 5.6 da task define explicitamente `record AlterarSenhaCommand(Guid TitularId, ...)`, então o implementer seguiu a especificação.
- **Observação:** o padrão existente `ICurrentUserPermissions` (Application layer) É injetado diretamente em handlers (`CriarTitularCommandHandler`, etc.). Uma versão mais alinhada moveria `ICurrentTitular` para Application e o injetaria no handler. Non-blocking — segurança preservada, task atendida.

#### (c) `ICredencialTitularRepository.Update` adicionado; AsNoTracking original ✅ ACEITÁVEL
- `CredencialTitularRepository.cs:64-67` → `_context.CredenciaiTitular.Update(credencial)` marca a entidade como `Modified`.
- Handler chama `Update(credencial)` ANTES de mutar (`IncrementarFalha()`, `ResetarFalhas()`, `AtualizarSenhaHash()`). Como `Update()` anexa com estado `Modified` para todas as propriedades, os valores finais no momento do `SaveChangesAsync()` são persistidos. Ordem attach→mutate é segura.
- Testes verificam `Update` chamado `Times.Once` + `SaveChangesAsync` `Times.Once` em cada caminho de mutação.

#### (d) `ITitularRepository.GetByDocumentoAsync` adicionado ✅ ACEITÁVEL
- `TitularRepository.cs:124-141` → `SqlQuery<Guid>` parametrizada `WHERE "Cpf" = {doc} OR "Cnpj" = {doc}` com `doc = documento.ToUpperInvariant()`. Depois carrega o titular por ID via `_context.Titulares.AsNoTracking().Include(Associacao).FirstOrDefaultAsync(...)`.
- Consistente com `ExisteDocumentoAsync` existente (mesmo padrão de SqlQuery para contornar `HasConversion` em VOs).
- Parametrizada (não concatenada) → sem SQL injection.

---

## 4. Issues Encontradas

Nenhum defeito bloqueante. Duas observações menores (não-bloqueantes, registradas para dívida técnica):

1. **Duplicação de constante TTL** — Severidade: Baixa (cosmético / manutenibilidade)
   - `LoginTitularCommandHandler.cs:29` define `TokenTtl = TimeSpan.FromMinutes(60)`.
   - `TitularTokenService.cs:23` define `ExpiraEm = TimeSpan.FromMinutes(60)`.
   - Ambos alinhados hoje; divergência futura faria `LoginResponse.ExpiraEm` mentir sobre a expiração real do token.
   - Sugestão: `ITitularTokenService.Gerar(titular)` poderia retornar `(token, expiraEm)` para single source of truth.

2. **Query extra de titular no login** — Severidade: Baixa (performance)
   - `LoginTitularCommandHandler:100` faz `_titularRepository.GetByIdAsync(credencial.TitularId)` após validar a credencial, pois `ByDocumentoAsync` retorna apenas a credencial (não o titular).
   - Correto funcionalmente; poderia ser otimizado no futuro retornando o titular junto na query de credencial (JOIN). Non-blocking.

Nenhum dos dois afeta corretude, segurança ou atendimento aos critérios de sucesso da task.

---

## 5. Recomendação Final

### **APROVADA**

**Justificativa:**
- Build: 0 erros.
- 276/276 testes unitários passando (16 novos da task + 260 pré-existentes sem regressão).
- Todas as subtarefas 5.1–5.10 implementadas e verificadas.
- RF-01 a RF-07 plenamente atendidos; RF-06 (mensagem genérica) verificado em TODOS os caminhos de falha.
- Pontos críticos de segurança (BCrypt work factor 12, anti-tampering do TitularId via JWT, lockout exponencial, LGPD em logs/DTOs) confirmados.
- Os 4 desvios flaggeados pelo implementer foram validados contra o codebase e são aceitáveis (seguem convenções existentes ou atendem ao texto da task).
- Os 2 issues menores são observações de manutenibilidade/performance, não bloqueantes.
- Verificação HTTP do pipeline (policy PortalTitular, JWT validation) deferida para task 16.0 (testes de integração), conforme assignment.

Quality ledger atualizado em `docs/ai-dev/quality-ledger.md`.
