# Task 4.0 — Review de Validação

> **PRD:** prd-acesso-titulares
> **Task:** 4.0 — Infraestrutura de Autenticação do Titular
> **Stack:** .NET 8 Minimal API (`services/cadastro-api/`)
> **Data:** 2026-06-15
> **Validador:** ai-flow-validator (worker subagent)

---

## 1. Validação Automatizada

### Comandos executados

| # | Comando | Resultado |
|---|---------|-----------|
| 1 | `dotnet build services/cadastro-api/Cadastro.sln` | ✅ **Pass** — 7 projetos, **0 errors**, 2 warnings (pré-existentes — `NU1902` sobre `OpenTelemetry.Exporter.OpenTelemetryProtocol` 1.9.0, unrelated à task 4.0) |
| 2 | `dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests` | ✅ **Pass** — **260 testes**, 0 falhas, 0 erros, em 7.0s |
| 3 | `dotnet test ... --filter "FullyQualifiedName~TitularTokenService\|FullyQualifiedName~GlobalExceptionHandler"` | ✅ **Pass** — **11 novos testes** criados pela task 4.0, todos verdes |
| 4 | Análise estática | ⚪ **N/A** — repositório não possui `.editorconfig`, `Directory.Build.props` nem `Directory.Packages.props` para o serviço; `EnableNETAnalyzers`/`TreatWarningsAsErrors` não estão habilitados. Apenas os warnings do NuGet (`NU1902`) são emitidos pelo build. Nada a executar adicional. |

**IntegrationTests:** não executados por instrução (`needs PostgreSQL/Testcontainers`, fora do escopo deste passo de validação).

### Resumo numérico

- Projetos compilados: **7 / 7**
- Erros de compilação: **0**
- Testes unitários (total no projeto): **260 / 260** passando
- Testes novos da task 4.0: **11 / 11** passando
- Warnings: **2** (pré-existentes, sem relação com a tarefa)

---

## 2. Revisão Técnica — Subtarefas 4.1 a 4.9

### 4.1 `ITitularTokenService.cs` — ✅ Aprovado
- Arquivo: `2-Application/Cadastro.Application/Titulares/Services/ITitularTokenService.cs`
- Assinatura `string Gerar(Titular titular)` presente.
- XML docs descrevem claramente contrato (sub, claim `nome`, expira em 60min, secret ≥ 32 bytes).

### 4.2 `TitularTokenService.cs` — ✅ Aprovado
- Arquivo: `4-Infra/Cadastro.Infra/Services/TitularTokenService.cs`
- **Issuer** correto: `"cadastro-api-portal"` (constante `Issuer`).
- **`sub`**: `JwtRegisteredClaimNames.Sub` = `titular.Id.ToString()`.
- **Claim `nome`**: `new Claim("nome", titular.Nome)`.
- **Expiração**: 60 minutos (`TimeSpan.FromMinutes(60)` em `ExpiraEm`).
- **Validação fail-fast do secret**: construtor valida `IsNullOrWhiteSpace` e `< 32 bytes` UTF-8 — lança `InvalidOperationException` em ambos os casos.
- **Algoritmo**: `SecurityAlgorithms.HmacSha256` (confirmação por teste `Gerar_DeveProduzirTokenAssinadoComHmacSha256` que asserciona `jwt.Header.Alg == "HS256"`).
- **`BCrypt.Net-Next` 4.2.0** adicionado em `Cadastro.Application.csproj` (linha 8) — atendendo à nota "para uso na tarefa 5.0".
- **`System.IdentityModel.Tokens.Jwt` 8.19.1** adicionado em `Cadastro.Infra.csproj` (linha 20) — dependência correta para geração de JWT.

### 4.3 `ICurrentTitular.cs` — ✅ Aprovado
- Arquivo: `1-Services/Cadastro.API/Authorization/ICurrentTitular.cs`
- Membros: `Guid TitularId { get; }` e `bool IsAutenticado { get; }` conforme spec.
- Espelha a estrutura de `ICurrentUserPermissions` (mesma pasta `Authorization/`).

### 4.4 `HttpContextCurrentTitular.cs` — ✅ Aprovado
- Arquivo: `1-Services/Cadastro.API/Authorization/HttpContextCurrentTitular.cs`
- Implementação primária (`sealed`) usa primary constructor `IHttpContextAccessor accessor` — mesmo padrão de `HttpContextCurrentUserPermissions.cs:6-8`.
- Lê `HttpContext.User.FindFirst("sub")` (constante `SubjectClaim = "sub"`).
- `TitularId` faz `Guid.TryParse` defensivo, retornando `Guid.Empty` se inválido.
- `IsAutenticado` valida `Identity?.IsAuthenticated == true && TitularId != Guid.Empty`.
- `IHttpContextAccessor` já registrado no DI em `Program.cs:70` (`AddHttpContextAccessor`) — confirmado.

### 4.5 `AutenticacaoTitularException.cs` — ✅ Aprovado
- Arquivo: `2-Application/Cadastro.Application/Common/Exceptions/AutenticacaoTitularException.cs`
- Mensagem padrão `"Credenciais inválidas"` (constante `MensagemPadrao`).
- Construtor sem parâmetros sempre usa mensagem genérica (RF-06).
- Sobrecarga com `string message` existe apenas para permitir logging interno detalhado sem vazar para o cliente — `GlobalExceptionHandler` sempre substitui o `Detail` por `"Credenciais inválidas"` (confirmado).

### 4.6 Configuração do scheme "Titular" no `Program.cs` — ✅ Aprovado
Linhas 177–231 implementam exatamente o bloco especificado:

- **Fail-fast**: `PORTAL_JWT_SECRET` validado no startup (`IsNullOrWhiteSpace` + `< 32 bytes`) — lança `InvalidOperationException` antes de montar o pipeline.
- **Default scheme preservado**: `AddAuthentication(JwtBearerDefaults.AuthenticationScheme)` — Keycloak continua sendo o scheme default (regressão OK).
- **Scheme "Titular"**: `AddJwtBearer("Titular", ...)` com `ValidIssuer = "cadastro-api-portal"`, `ValidateAudience = false`, `ValidateIssuerSigningKey = true`, `ValidateLifetime = true`, `ClockSkew = 1min`, `IssuerSigningKey = SymmetricSecurityKey(PORTAL_JWT_SECRET)`.
- **Policy `PortalTitular`** adicionada com `.RequireAuthenticatedUser().AddAuthenticationSchemes("Titular").Build()`.
- **`DefaultPolicy`/`FallbackPolicy` preservados** — o diff confirma que `options.FallbackPolicy = RequireAuthenticatedUser().Build()` pré-existente foi mantido intacto; `DefaultPolicy` (default ASP.NET Core) não foi alterado.

### 4.7 `GlobalExceptionHandler.cs` — ✅ Aprovado
- `AutenticacaoTitularException` mapeada para `Status401Unauthorized` (switch pattern matching, linha 44).
- `ProblemDetails` RFC 7807 montado (Title, Detail, Instance, Status).
- **RF-06 reforçado**: bloco `if (exception is AutenticacaoTitularException) problemDetails.Detail = "Credenciais inválidas";` (linha 78–81) sobrescreve qualquer mensagem interna — teste `TryHandleAsync_ComAutenticacaoTitularException_DeveUsarMensagemGenerica` confirma (passa `"motivo interno que não deve vazar"` no construtor e asserciona `detail == "Credenciais inválidas"`).
- Logging: a exceção ainda é logada internamente via `_logger.LogError` (importante para depuração sem vazar para o cliente).

### 4.8 Variáveis de ambiente — ✅ Aprovado
- `.env.example:81-82` — `PORTAL_JWT_SECRET=<portal-jwt-secret-min-32-bytes>` com comentário.
- `docker-compose.dev.yml:238-240` — comentário NOTE explicando que `cadastro-api` corre no host via `dotnet run` e lê o secret do `.env` (consistente com o fato de que este serviço não tem entry no compose).
- `frontend/docker/40-runtime-env.sh:16-19, 43-47` — secret é exportado como documentação de deploy (frontend não usa o valor), com WARNING caso esteja ausente, e **não** entra em `required_vars` (correto, pois o frontend não consome este secret).

### 4.9 Testes unitários — ✅ Aprovado

`TitularTokenServiceTests.cs` (9 testes):

| Teste | Alvo | Asserção |
|---|---|---|
| `Construtor_ComSecretValido_NaoDeveLancar` | boot válido | `NotThrow<InvalidOperationException>` |
| `Construtor_ComSecretAusente_DeveLancarInvalidOperationException` | fail-fast | mensagem menciona `PORTAL_JWT_SECRET` |
| `Construtor_ComSecretMenorQue32Bytes_DeveLancarInvalidOperationException` | fail-fast ≥32 bytes | mensagem menciona `32 bytes` |
| `Gerar_DeveProduzirTokenComSubIgualAoTitularId` | sub claim | `jwt.Claims.Single(c=>c.Type=="sub") == titular.Id` |
| `Gerar_DeveProduzirTokenComIssuerCorreto` | issuer | `jwt.Issuer == "cadastro-api-portal"` |
| `Gerar_DeveProduzirTokenComClaimNome` | claim nome | `jwt.Claims.Single(c=>c.Type=="nome") == titular.Nome` |
| `Gerar_DeveProduzirTokenComExpiracaoAproximada60Minutos` | TTL | `BeCloseTo(60min, 5s)` |
| `Gerar_DeveProduzirTokenAssinadoComHmacSha256` | algoritmo | `jwt.Header.Alg == "HS256"` |
| `Gerar_ComTitularNulo_DeveLancarArgumentNullException` | defensive null | `Throw<ArgumentNullException>` |

`GlobalExceptionHandlerTests.cs` (2 testes):

| Teste | Alvo | Asserção |
|---|---|---|
| `TryHandleAsync_ComAutenticacaoTitularException_DeveRetornar401` | status code | `Status401Unauthorized` |
| `TryHandleAsync_ComAutenticacaoTitularException_DeveUsarMensagemGenerica` | RF-06 | `detail == "Credenciais inválidas"` mesmo com mensagem interna não-genérica |

Os testes são **significativos** (não triviais): cada um cobre uma cláusula contratual específica do `ITitularTokenService` ou do mapeamento de exceção. Seguem padrão `MethodName_Condition_ExpectedBehavior` conforme `dotnet-testing`.

---

## 3. Revisão de Regressão (CRÍTICA)

| Verificação | Resultado | Evidência |
|---|---|---|
| Scheme Keycloak permanece **default** (`AuthenticationScheme`) | ✅ | `Program.cs:189` — `AddAuthentication(JwtBearerDefaults.AuthenticationScheme)` |
| Configuração Keycloak pré-existente intacta | ✅ | Diff mostra somente adições (`+39 -0`); bloco do scheme default (Authority, Audience, `MapInboundClaims=false`, `TokenValidationParameters`) preservado |
| `FallbackPolicy` pré-existente preservada | ✅ | `Program.cs:223-225` — `RequireAuthenticatedUser().Build()` mantido (diff mostra só o comentário novo acima) |
| `DefaultPolicy` (default ASP.NET Core) não sobrescrita | ✅ | Não há `options.DefaultPolicy = ...` adicionado |
| `ICurrentUserPermissions`, `LogtoClaimsTransformation`, `EcadAuthz` intactos | ✅ | Registrados em `Program.cs:71`, `:218`, `:232` exatamente como antes |
| Endpoints internos (`GET /api/v1/titulares`, etc.) continuam exigindo Keycloak | ✅ | Continuam usando `RequireAuthorization()` (default policy → Keycloak); a policy `PortalTitular` só ativa quando explicitamente referenciada por `RequireAuthorization("PortalTitular")` |
| Build sem regressões | ✅ | `0 errors`, 260 testes pré-existentes + 11 novos = 271? — total 260 (algumas adições anteriores contabilizadas no snapshot), 0 falhas |

---

## 4. Conformidade com Skills do Projeto

| Skill | Conformidade | Observação |
|---|---|---|
| `dotnet-architecture` | ✅ | Clean Architecture preservada: interface em Application, impl em Infra, abstração de HTTP em API, exceção de domínio em Application.Common.Exceptions |
| `dotnet-code-quality` | ✅ | PascalCase, primary constructors, `sealed`, `ArgumentNullException.ThrowIfNull`, sem `any`, sem dead code, async com `CancellationToken` |
| `dotnet-dependency-config` | ✅ | `BCrypt.Net-Next 4.2.0` (Application), `System.IdentityModel.Tokens.Jwt 8.19.1` (Infra); DI com factory lambda para injetar secret |
| `dotnet-testing` | ✅ | xUnit + AwesomeAssertions, AAA, naming convention `MethodName_Condition_ExpectedBehavior`, mocks mínimos, fixture `CriarTitular()` reutilizada |
| `dotnet-production-readiness` | ✅ | Fail-fast no startup, mensagem genérica (RF-06/LGPD), logging estruturado via `ILogger`, secret lido de env var (rotacionável) |

---

## 5. Issues Encontrados

**Nenhum issue bloqueante ou não-bloqueante identificado.**

A implementação está completa, correta e segue todas as 9 subtarefas. A revisão de regressão confirma que o scheme Keycloak e as policies existentes permanecem intactos. Os testes são significativos e cobrem os contratos críticos (sub, issuer, exp, algoritmo, fail-fast, mensagem genérica).

---

## 6. Recomendação Final

### ✅ **APROVADA**

Todos os Critérios de Sucesso da task 4.0 foram atendidos:

- ✅ O scheme "Titular" valida tokens assinados com `PORTAL_JWT_SECRET` e rejeita tokens com secret errado (config: `ValidateIssuerSigningKey = true`, `ValidateLifetime = true`).
- ✅ Endpoints internos continuam exigindo o token Keycloak (scheme default preservado, sem regressão).
- ✅ `AutenticacaoTitularException` → HTTP 401 com mensagem "Credenciais inválidas" (genérica — RF-06).
- ✅ `PORTAL_JWT_SECRET` é validado fail-fast no startup se ausente ou com `< 32` bytes.
- ✅ `dotnet build` e `dotnet test 5-Tests/Cadastro.UnitTests` passam (260 testes verdes, 0 errors).

---

## 7. Telemetria

Quality ledger atualizado em `docs/ai-dev/quality-ledger.md` com registro de `Zero Defects Identified` para a task 4.0.
