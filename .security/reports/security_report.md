# Security Audit Report — F03 Gestao de Obras Musicais

**Repo:** `/home/tsgomes/mcad`
**Service auditado:** `services/cadastro-api` (.NET 8 / ASP.NET Core Minimal API)
**PRD:** `tasks/cadastro/done-prd-gestao-obras/prd.md`
**Data:** 2026-05-12
**Modo:** auto-approve (executado sem pausas a pedido do usuario)

---

## 1. Sumario Executivo

A auditoria cobriu o feature F03 (Gestao de Obras Musicais) e seus pontos de extensao: endpoints HTTP, command handlers (criar/atualizar/depurar/excluir/dominio publico/obter ISWC), integracao externa com a API ISWC, listagem com filtros, Dockerfile e bibliotecas de autorizacao compartilhadas (`Ecad.Authz.*`).

**Decisao recomendada:** **BLOQUEAR DEPLOY DE PRODUCAO** ate remediar os dois achados **CRITICAL** (F-001 e F-002). Os achados HIGH e MEDIUM devem ser tratados nas proximas sprints. O hot-path da F03 (CRUD de obras, depuracao, ISWC) esta com **integridade funcional bem coberta** — invariantes de dominio e unicidade de ISWC sao defendidas em camada de dominio + indice unico no banco. Os riscos predominantes estao em **configuracao/segredos** (F-001/F-002) e **hardening de borda** (rate limit, Swagger, CORS).

### Resumo de findings

| Tier | Count |
|------|-------|
| CRITICAL | 2 |
| HIGH | 2 |
| MEDIUM | 2 |
| LOW | 7 |
| **Total** | **13** |

### Cobertura OWASP Top 10

| OWASP | Cobertura | Resultado |
|-------|-----------|-----------|
| A01 Broken Access Control | Semgrep + revisao manual | Sem achados criticos. Permissoes finas via `Ecad.Authz` e `RequireCadastroPermission`. |
| A02 Cryptographic Failures | Semgrep + Gitleaks + manual | **CRITICAL** (F-001) creds reais no repo; **MEDIUM** (F-007) DB SSL Disable default. |
| A03 Injection | Semgrep `p/csharp` + manual EF review | Sem achados. EF Core parametrizado; `EF.Functions.ILike` com placeholder. |
| A04 Insecure Design | Manual + Semgrep | **MEDIUM** (F-008) sem rate limit; **LOW** F-004/F-005/F-011/F-013. |
| A05 Misconfiguration | Hadolint + Manual | **CRITICAL** (F-002) AUTH_ENABLED kill switch; **HIGH** (F-006) Swagger publico; **LOW** (F-009) CORS. |
| A06 Vulnerable Components | Trivy + `dotnet list package --vulnerable` | Sem CVEs em deps NuGet declaradas (verificado via feed oficial). |
| A07 ID & Auth Failures | Manual + Semgrep | Auth via JWT Bearer + claims transformation OK. Atencao a F-001/F-002/F-012. |
| A08 Software Integrity | Trivy + manual | **LOW** (F-010) ausencia de `packages.lock.json` reduz garantia de reprodutibilidade da supply chain. |
| A09 Logging Failures | Semgrep + manual | Sem achados criticos. Outbox events serializam apenas `obraId/titulo/iswc/novaObraId` (nao PII). |
| A10 SSRF | Manual + Semgrep | **HIGH** (F-003) ISWC_BASE_URL via env sem allowlist — risco de exfiltracao por mis-config. |

### Ferramentas executadas (Docker)

| Ferramenta | Imagem | Resultado |
|------------|--------|-----------|
| Semgrep | `returntocorp/semgrep:latest` | 240 regras / 259 arquivos / **0 findings** |
| Gitleaks | `zricethezav/gitleaks:latest` | 161 commits / **3 leaks** |
| Hadolint | `hadolint/hadolint:latest` | Dockerfile / **0 findings** |
| Trivy fs | `aquasec/trivy:0.70.0` | services/cadastro-api / **0 findings** |
| `dotnet list package --vulnerable` | local (.NET 10.0.107) | 6 projetos / **0 packages vulneraveis** |

> Nota: o wrapper `tools/run.py` declarado no SKILL nao existe no repo (so `SKILL.md` e `templates/`). As ferramentas foram invocadas diretamente via `docker run` com volume mount do workspace.

---

## 2. Achados Detalhados

### F-001 — Credenciais reais comprometidas em `.env` e `.env.swarm.example` *(CRITICAL)*

**OWASP:** A02 + A07
**Categoria:** Secrets in repository
**Ferramenta:** Gitleaks (`generic-api-key`)

**Evidencias:**

- `services/identificacao-api/.env:5` — arquivo `.env` **rastreado pelo git** apesar de `.env` estar em `.gitignore`. Foi adicionado ao repo no commit `0fbfbc31` (`feat(platform): consolidar auth, distribuicao e deploy`). Contem:
  - `RABBITMQ_USER=brhqehoy`
  - `RABBITMQ_PASSWORD=BP3SznplJcc2dlul3thHIflr3HjEoJ26`
  - `RABBITMQ_URL=amqps://brhqehoy:...@kebnekaise.lmq.cloudamqp.com:5671`
  - `MINIO_ACCESS_KEY=minioadmin` / `MINIO_SECRET_KEY=minioadmin` (default cred do MinIO)
  - `SUPER_USER=gestauto` / `SUPER_PASS=gestauto123`
- `.env.swarm.example:9` — apesar do sufixo `.example`, contem as **mesmas credenciais reais** (`BP3SznplJcc2dlul3thHIflr3HjEoJ26`) e o host `kebnekaise.lmq.cloudamqp.com`.

**Impacto:** O endpoint `kebnekaise.lmq.cloudamqp.com:5671` e acessivel da internet (CloudAMQP). Qualquer pessoa com acesso ao repo (incluindo historico no GitHub publico/privado) pode autenticar como `brhqehoy` no vhost dedicado e ler/publicar eventos no broker compartilhado por **todos os servicos do mcad** (cadastro/identificacao/arrecadacao/distribuicao). Em chave MinIO `minioadmin/minioadmin` o atacante pode tambem ler o object storage.

**Severidade calculada:**
- base 8.0 (creds em repo publico) x asset 1.5 (credentials) x exploitability 1.5 (endpoint internet-facing) = **18.0 → CRITICAL**

**Localizacao:**
- `services/identificacao-api/.env:1-15`
- `.env.swarm.example:8-11`
- Historico: `git log --all` mostra ambos rastreados desde `0fbfbc31`.

**Remediacao:**
1. **Imediato:** revogar e rotacionar todas as credenciais expostas (RabbitMQ user `brhqehoy`, MinIO creds, qualquer outro segredo presente).
2. `git rm --cached services/identificacao-api/.env` e re-commit.
3. Reescrever historico usando `git filter-repo` ou `BFG` para remover os segredos dos commits antigos. Force-push apos coordenar com o time.
4. Substituir `.env.swarm.example` por placeholders `change-me-*` em **todos** os campos sensiveis.
5. Adicionar pre-commit hook com `gitleaks protect --staged`.
6. Adotar gestao de segredos externa (Docker Swarm Secrets, K8s Secrets, Vault, etc.) e remover credenciais do compose.

---

### F-002 — `AUTH_ENABLED=false` desativa autenticacao e autorizacao completamente *(CRITICAL)*

**OWASP:** A05 + A07
**Categoria:** Security misconfiguration / fail-open kill switch
**Ferramenta:** revisao manual

**Evidencias:**

- `services/cadastro-api/1-Services/Cadastro.API/Program.cs:30-33,142-180`
- `services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroAuthorizationExtensions.cs:13-15`
- `libs/dotnet/Ecad.Authz.AspNetCore/PermissionAuthorizationHandler.cs:28-32`

```csharp
// Program.cs:30
var authEnabled = !string.Equals(builder.Configuration["AUTH_ENABLED"], "false", ...);

// CadastroAuthorizationExtensions.cs:13
return authEnabled
    ? builder.RequirePermission(permission)
    : builder.AllowAnonymous();

// PermissionAuthorizationHandler.cs:28
if (!_options.CurrentValue.Enabled)
{
    context.Succeed(requirement);
    return;
}
```

**Impacto:** Uma unica variavel de ambiente (`AUTH_ENABLED=false`) — possivelmente definida por engano, herdada de um `.env` de desenvolvimento, ou injetada em runtime — desativa **toda** a cadeia de autenticacao JWT, ignora `RequireAuthenticatedUser` fallback e marca todos os endpoints como `AllowAnonymous`. Nao ha "fail-closed" de seguranca: se o framework de auth detecta o flag, ele responde 200 OK para qualquer requisicao sem token. Combinado com Swagger publico (F-006) e enumeracao trivial dos endpoints.

**Severidade calculada:**
- base 7.0 (auth bypass por config) x asset 1.5 (auth) x exploitability 1.5 (1 env var) = **15.75 → CRITICAL**

**Remediacao:**
1. Restringir o toggle a `ASPNETCORE_ENVIRONMENT == "Development"` — qualquer outro ambiente forca `authEnabled = true` regardless of env var.
2. Adicionar startup-time fail-fast: `if (authEnabled == false && !env.IsDevelopment()) throw new InvalidOperationException("AUTH_ENABLED=false is only allowed in Development");`.
3. Logar `[CRITICAL]` quando auth desativada, com hostname/env para alertar dashboards.
4. Cobrir com teste de integracao: `Production` env + `AUTH_ENABLED=false` deve falhar startup.

---

### F-003 — `ISWC_BASE_URL` aceita qualquer URL (sem allowlist) — risco de exfiltracao de metadados *(HIGH)*

**OWASP:** A10 (SSRF-by-config) + A05
**Categoria:** Trust boundary configuration
**Ferramenta:** revisao manual

**Evidencias:**

- `services/cadastro-api/1-Services/Cadastro.API/Program.cs:90-95`
- `services/cadastro-api/4-Infra/Cadastro.Infra/ExternalServices/IswcService.cs:16-29`

```csharp
var iswcBaseUrl = Environment.GetEnvironmentVariable("ISWC_BASE_URL") ?? "https://iswc.tasso.dev.br/";
builder.Services.AddHttpClient<IIswcService, IswcService>(client =>
{
    client.BaseAddress = new Uri(iswcBaseUrl);   // sem validacao
    client.Timeout = TimeSpan.FromSeconds(10);
}).AddTransientHttpErrorPolicy(p => p.RetryAsync(2));
```

**Impacto:** A URL e tratada como confiavel. Qualquer ator com permissao de editar variaveis de ambiente (Swarm/K8s admin, CI/CD compromissado, container compose mal-configurado) pode redirecionar a chamada de `POST /api/v1/obras/{id}/iswc` para `https://attacker.example/`, exfiltrando para cada chamada:

- `work_title` (titulo da obra)
- `authors[]` (nomes completos dos titulares autorais)
- `association_code` (sigla da associacao)

Os dados em si nao sao PII forte, mas constituem **catalogo musical** — informacao competitiva com valor de mercado. Tambem desencadeia chamadas com retry automatico (Polly 2x) para o endpoint atacante.

**Severidade calculada:**
- base 6.0 (exfil sensivel via mis-config) x asset 1.0 x exploitability 1.0 = **6.0 → MEDIUM**, mas elevado a **HIGH** pelo escopo (executa por chamada na hot-path do feature) e pela ausencia de alerta.

**Remediacao:**
1. Validar `iswcBaseUrl` no startup contra allowlist de hosts (`new[] {"iswc.tasso.dev.br"}`).
2. Logar e alertar quando `BaseAddress` resolva para IP privado/loopback/metadata (`169.254.169.254`).
3. Adicionar Polly circuit breaker para detectar saltos repentinos de latencia/erro (indicio de redirect malicioso).
4. (Opcional) Adicionar header HMAC com chave compartilhada para autenticar o backend e detectar substituicao.

---

### F-006 — Swagger UI e AsyncAPI servidos sem gate por ambiente *(HIGH)*

**OWASP:** A05
**Categoria:** API surface leak
**Ferramenta:** revisao manual

**Evidencias:** `services/cadastro-api/1-Services/Cadastro.API/Program.cs:123,194,227`

```csharp
builder.Services.AddSwaggerDocs();   // sempre
...
app.UseSwaggerDocs();                // sempre, antes do auth
...
app.MapAsyncApiDocs();               // sem auth, comentario explica: "documentação de eventos — pública"
```

**Impacto:** `UseSwaggerDocs()` e chamado antes do `UseAuthentication`/`UseAuthorization`. Em producao, qualquer pessoa enumera:

- Todos os endpoints com paths exatos (incluindo os condicionais `/depurar`, `/bloquear`)
- Schemas DTO (`AtualizarObraRequest`, `BloquearObraRequest`) — facilitando payload crafting
- Eventos publicados via AsyncAPI (`cadastro.obra.depurada`, etc.) — leak de fluxos de negocio

Combinado com F-002 (auth disabled) ou F-001 (creds leak), a superficie de ataque fica totalmente mapeada para o atacante.

**Severidade calculada:** base 4.0 x asset 1.0 x exploitability 1.5 (publico) = **6.0 → HIGH-bordeline / categorizado HIGH pelo composito com F-002**.

**Remediacao:**
1. Condicionar `UseSwaggerDocs` a `app.Environment.IsDevelopment()`. Alternativamente: proteger com `[Authorize]` baseado em role admin.
2. Mover `MapAsyncApiDocs` para atras de auth (mesmo que com policy `cadastro:docs:view`).
3. Remover a frase "publica" do comentario — eventos sao internos.

---

### F-007 — Conexao Postgres sem TLS por default (`SSL Mode=Disable`) *(MEDIUM)*

**OWASP:** A02
**Categoria:** Crypto failure / data in transit
**Ferramenta:** revisao manual

**Evidencias:** `services/cadastro-api/1-Services/Cadastro.API/Program.cs:42-45`

```csharp
var dbSslMode = Environment.GetEnvironmentVariable("CADASTRO_DB_SSL_MODE") ?? "Disable";
var connectionString = $"...SSL Mode={dbSslMode};Trust Server Certificate=true";
```

Default e `Disable` e `Trust Server Certificate=true` desabilita validacao do certificado mesmo quando SSL e ativado por env. Em producao via Docker Swarm o trafego DB e off-host quando Postgres roda em managed service.

**Severidade calculada:** base 5.0 x asset 1.0 x exploitability 1.0 = **5.0 → MEDIUM**.

**Remediacao:**
1. Default `Require` ou `VerifyFull`.
2. Trocar `Trust Server Certificate=true` por `Trust Server Certificate=false` quando o ambiente for `Production`.
3. Adicionar startup fail-fast em prod: `if (!env.IsDevelopment() && sslMode == "Disable") throw ...`.

---

### F-008 — Sem rate limiting em endpoints idempotentes-mas-caros (`/iswc`, `/depurar`) *(MEDIUM)*

**OWASP:** A04
**Categoria:** Insecure design / cost amplification
**Ferramenta:** revisao manual

**Evidencias:** ausencia de `AddRateLimiter` / `UseRateLimiter` em `Program.cs`. Nenhum middleware/decorator de rate-limit em `ObraEndpoints.cs`.

**Impacto:**

1. `/api/v1/obras/{id}/iswc` invoca API externa (`iswc.tasso.dev.br`). Um cliente autenticado pode disparar centenas de requests/sec, ate o cap dos 10s por chamada, gerando custo no provedor externo e amplificando trafego. Polly faz 2 retries por erro transitorio, multiplicando o trafego em ate 3x.
2. `/depurar` cria uma obra nova + N titularidades + outbox event a cada chamada. Sem rate limit + sem idempotency key, um double-click ou retry de cliente gera duplicacao logica (a segunda chamada falha em obra.Depurar() porque o status mudou, mas a primeira ja consumiu cota).

**Severidade calculada:** base 4.0 x asset 1.0 x exploitability 1.0 = **4.0 → MEDIUM**.

**Remediacao:**
1. Adicionar `AddRateLimiter` (Asp.NET Core 8) com policy global `100 req / minuto / user`.
2. Aplicar policy mais restritiva (`5 req / minuto / user`) a `/iswc` e `/depurar`.
3. (Bonus) suportar header `Idempotency-Key` em `/depurar` e `/iswc` para deduplicar retries do cliente.

---

### F-004 — TOCTOU em `ExisteIswcAsync` vs `AtribuirIswc` *(LOW — mitigado)*

**OWASP:** A04
**Categoria:** Race condition
**Ferramenta:** revisao manual

**Evidencias:**

- `services/cadastro-api/2-Application/Cadastro.Application/Obras/Commands/ObterIswcCommand.cs:62-69`
- `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/20260403190454_AddCodigo_CampoCodigo.Designer.cs:304-305` — `HasIndex("Iswc").IsUnique()` esta presente.

```csharp
if (await _repository.ExisteIswcAsync(iswc, cancellationToken))   // T1: false
    throw new ConflictException(...);                              // T1: pass
obra.AtribuirIswc(iswc);                                            // T1+T2 both reach here
await _repository.SaveChangesAsync(...);                            // T2 fails on unique index
```

**Impacto:** Duas requisicoes concorrentes que recebem o mesmo ISWC da API externa passam pelo check `Existe` (TOCTOU). Mitigado pelo indice unico em DB — a segunda transacao falha com `DbUpdateException` (`23505`), mas o usuario recebe `500 Internal Server Error` em vez do `409 Conflict` amigavel.

**Severidade calculada:** base 5.0 (race) x asset 1.0 x exploitability 0.5 (mitigado) = **2.5 → LOW**.

**Remediacao:** capturar `DbUpdateException` cujo `InnerException` seja `PostgresException` com `SqlState = "23505"` no `GlobalExceptionHandler` e re-mapear para 409. Manter o check `ExisteIswcAsync` para UX (mensagem amigavel no caminho comum).

---

### F-005 — `MarcarDominioPublico` aceita transicao de `Bloqueado` *(LOW)*

**OWASP:** A04
**Categoria:** Business logic flaw
**Ferramenta:** revisao manual

**Evidencias:** `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/ObraMusical.cs:118-130`

```csharp
public void MarcarDominioPublico(bool valor)
{
    if (Status == StatusObra.Depurada)
        throw new StatusConflictException(...);    // unico bloqueio
    if (valor) Status = StatusObra.DominioPublico;
    else Status = Iswc != null ? StatusObra.Liberado : StatusObra.Pendente;
    ...
}
```

PRD F03 RF-23: "Flag manual 'Domínio Público' na tela de edição da obra (apenas status PENDENTE ou LIBERADO)". A entidade so bloqueia `Depurada` — `Bloqueado` e qualquer outro estado nao previsto pelo PRD ainda transicionam.

**Severidade calculada:** base 3.0 x asset 1.0 x exploitability 0.7 (autenticado, requer permissao) = **2.1 → LOW**.

**Remediacao:** adicionar guard `if (Status != Pendente && Status != Liberado && Status != DominioPublico) throw new StatusConflictException(...)`. Estender `AlterarDominioPublicoCommand` com FluentValidator que rejeite no-op (toggle do estado atual).

---

### F-009 — CORS `AllowAnyHeader().AllowAnyMethod()` *(LOW)*

**OWASP:** A05
**Categoria:** Misconfig
**Ferramenta:** revisao manual

**Evidencias:** `services/cadastro-api/1-Services/Cadastro.API/Program.cs:132-136`. Origins sao restritas via env, mas headers e methods permitem qualquer valor — ampliando o efeito de um origin malicioso autorizado por engano.

**Remediacao:** listar explicitamente metodos (`GET`, `POST`, `PUT`, `DELETE`) e headers (`Content-Type`, `Authorization`).

---

### F-010 — `.csproj` sem `packages.lock.json` *(LOW)*

**OWASP:** A08
**Categoria:** Supply chain integrity
**Ferramenta:** Trivy fs (notado por nao detectar deps por falta de lock)

**Impacto:** sem lock files, builds reproduziveis dependem de NuGet feed estavel. Trivy nao consegue auditar transitivas com fidelidade. O comando `dotnet list package --vulnerable` confirma zero vulneraveis hoje, mas a configuracao nao garante o futuro.

**Remediacao:** habilitar `<RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>` em todos os `.csproj` e versionar `packages.lock.json`.

---

### F-011 — Commands `AlterarDominioPublico`, `Depurar`, `ObterIswc` sem `FluentValidator` *(LOW)*

**OWASP:** A04
**Categoria:** Input validation gap
**Ferramenta:** revisao manual

**Evidencias:** `2-Application/Cadastro.Application/Obras/Commands/*` contem validators apenas para `CriarObraCommandValidator` e `AtualizarObraCommandValidator`. `DepurarObraCommand` aceita um `request.Tipo` que e parseado via `Enum.Parse` sem checagem previa — chamada com `Tipo="INVALIDO"` causa `ArgumentException` (500) em vez de `400 Bad Request`.

**Remediacao:** criar `DepurarObraCommandValidator` e `AlterarDominioPublicoCommandValidator` espelhando as regras de `AtualizarObraCommandValidator`. Garantir cobertura no `Cadastro.UnitTests`.

---

### F-012 — JWT/header em documentacao de teste E2E *(LOW)*

**OWASP:** A07
**Categoria:** Secret in docs
**Ferramenta:** Gitleaks (`curl-auth-header`)

**Evidencias:** `tasks/cadastro/prd-seed-associacoes/plano-teste-e2e.md:118` — exemplo de curl com `Authorization: Bearer ...` que pode conter token nao-redacted.

**Remediacao:** sanitizar para `Bearer <TOKEN>` placeholder. Adicionar regra de pre-commit para nao aceitar JWTs em docs.

---

### F-013 — Polly retry replays payload sensitivel para ISWC API em falha transitoria *(LOW)*

**OWASP:** A04 + A10
**Categoria:** Insecure design
**Ferramenta:** revisao manual

**Evidencias:** `Program.cs:95` `.AddTransientHttpErrorPolicy(p => p.RetryAsync(2))`. Se a API ISWC sofre comprometimento ou MITM, a politica re-envia payload completo (titulos + autores) ate 3x.

**Remediacao:** considerar circuit breaker com timeout maior em vez de retry simples; OR aceitar como tradeoff e documentar.

---

## 3. Casos NOT_EXECUTED / Skipped

| Case ID | Razao |
|---------|-------|
| NoSQL Injection | Stack 100% Postgres + EF — sem driver NoSQL |
| LDAP / XXE | Sem clientes / parsers expostos |
| Deserializacao Pickle/BinaryFormatter | Sem uso detectado |
| Kubernetes/Terraform IaC | Manifests dedicados nao fazem parte do escopo F03 |
| Container image scan | Requer build da imagem `tassosgomes/mcad-cadastro-api:0.1.0` previamente. Recomendado executar antes de cada release como gate de pipeline |

---

## 4. Mapeamento Ativo -> Achado

| Asset | Achados aplicaveis |
|-------|--------------------|
| ASSET-001 Obras (catalogo) | F-003, F-008 |
| ASSET-002 ISWC unico | F-004 (mitigado), F-008 |
| ASSET-003 Imutabilidade DEPURADA | nenhum (logica dominio OK) |
| ASSET-004 RBAC analista/consultor | F-002 (kill switch) |
| ASSET-005 JWT/sessao | F-001, F-002, F-012, F-006 |

---

## 5. Decisao e Proximos Passos

**Pre-deploy gate:**
- [ ] F-001 remediado (revogar+rotacionar+rewrite history)
- [ ] F-002 remediado (auth toggle restrito a Development)

**Pre-release sprint:**
- [ ] F-003 allowlist do ISWC base URL
- [ ] F-006 Swagger/AsyncAPI gate por env
- [ ] F-007 default SSL Require + fail-fast em prod
- [ ] F-008 rate-limit global + por endpoint

**Backlog:**
- [ ] F-004 mapear 23505 -> 409
- [ ] F-005 guard de status em MarcarDominioPublico
- [ ] F-009 CORS metodos+headers explicitos
- [ ] F-010 habilitar packages.lock.json
- [ ] F-011 validators para Depurar / Dominio Publico / ObterIswc
- [ ] F-012 sanitizar JWT em docs
- [ ] F-013 considerar circuit breaker no Polly

**Integracao com qa-workflow:** anexar este relatorio ao `qa_report.md` da feature F03; F-001 e F-002 devem entrar como QA-blockers.

**Rastreabilidade:**
- Imagens Docker fixadas: `returntocorp/semgrep:latest`, `zricethezav/gitleaks:latest`, `hadolint/hadolint:latest`, `aquasec/trivy:0.70.0`.
- Artefatos gerados: `.security/security_profile.json`, `.security/scope.json`, `.security/test_plan.md`, `.security/findings/{semgrep,gitleaks,hadolint,trivy}.sarif`, `.security/reports/security_report.md`.
