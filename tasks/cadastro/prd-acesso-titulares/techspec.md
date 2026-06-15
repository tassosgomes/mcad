# Tech Spec — F11: Acesso de Titulares (Portal do Titular)

> **PRD:** `tasks/cadastro/prd-acesso-titulares/prd.md`
> **Visão:** `vision.md` · **Domínio:** `domains/cadastro/domain.md`
> **Data:** 2026-06-14

---

## Resumo Executivo

O Portal do Titular é uma área de autoatendimento exposta pelo `cadastro-api` (.NET 8) e por uma nova sub-árvore de rotas `/portal/*` no frontend React existente. A autenticação do titular é **interna** (CPF/CNPJ + senha com hash BCrypt), distinta do fluxo OIDC/Logto dos usuários internos: o `cadastro-api` emite um **JWT próprio assinado por HMAC-SHA256** (segundo scheme `AddJwtBearer("Titular")`) com `sub = titularId` e TTL de 60 minutos.

Três novas entidades de domínio (`CredencialTitular`, `Ocorrencia`, `SolicitacaoAlteracao`) são persistidas no schema `cadastro`, reaproveitando os padrões existentes de CQRS nativo, Outbox/CloudEvents, auditoria two-tier e `IEntityTypeConfiguration<T>`. Os endpoints do titular são protegidos pelo scheme Titular e filtram dados por `titularId` extraído do token; os endpoints do Analista (triagem/aprovação) continuam no scheme Keycloak com novas permissões `cadastro:default:{ocorrencia,solicitacao-alteracao}:*`. No frontend, um `PortalAuthProvider` paralelo é montado apenas sob `/portal/*`, com `PortalLayout` próprio e refator leve do `createAuthenticatedFetchClient()` para aceitar `tokenProvider` por instância (evitando colisão com os 7 setters singleton do fluxo OIDC).

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
┌─ Frontend (mesmo Vite app) ──────────────────────────────────────┐
│  / (OIDC/Logto)        ─── ProtectedRoute ─ MainLayout/Sidebar    │
│  /portal/* (JWT Titular)── PortalProtectedRoute ─ PortalLayout    │
│       └─ PortalAuthProvider (login CPF/CNPJ+senha → JWT)          │
└───────────┬───────────────────────────────────┬───────────────────┘
            │ Bearer (Logto)                     │ Bearer (JWT Titular)
            ▼                                    ▼
┌─ cadastro-api (.NET 8) ───────────────────────────────────────────┐
│  Scheme "Keycloak" (existente)          Scheme "Titular" (novo)    │
│   ├─ /api/v1/titulares, obras...         ├─ /api/v1/portal/auto-cadastro (anon)
│   ├─ /api/v1/ocorrencias (analista)      ├─ /api/v1/portal/auth/login (anon)
│   └─ /api/v1/solicitacoes-alteracao      ├─ /api/v1/portal/me, /contato, /senha
│       (RequireCadastroPermission)        ├─ /api/v1/portal/minhas-obras
│                                          ├─ /api/v1/portal/meus-fonogramas
│                                          ├─ /api/v1/portal/ocorrencias (titular)
│                                          └─ /api/v1/portal/solicitacoes-alteracao
│                                                                     │
│  CQRS (Commands/Queries/Handlers) ─ Domain ─ EF Core (schema cadastro)
│  Outbox ─ CloudEvents → RabbitMQ exchange cadastro.events           │
│  Audit two-tier (EfAuditOutboxClient + per-entity publishers)       │
└─────────────────────────────────────────────────────────────────────┘
```

**Componentes novos:** `CredencialTitular` (auth), `Ocorrencia` (state machine), `SolicitacaoAlteracao` (state machine), VOs `Email`/`Telefone`, `ITitularTokenService`, `ICurrentTitular`, `PortalEndpoints.cs`, `OcorrenciaEndpoints.cs`, `SolicitacaoAlteracaoEndpoints.cs`, `CadastroPermissions` (8 novas chaves de analista).

---

## Design de Implementação

### Interfaces Principais

**Autenticação do titular (Application/Infra):**

```csharp
// 2-Application: geração/validação de token
public interface ITitularTokenService {
    string Gerar(Titular titular);                          // JWT HMAC, 60min
}

// 1-Services: extração do titular autenticado (espelha ICurrentUserPermissions)
public interface ICurrentTitular {
    Guid TitularId { get; }                                  // lê claim sub do scheme "Titular"
    bool IsAutenticado { get; }
}
```

**Repositórios (Domain, espelham IAnexoRepository):**

```csharp
public interface ICredencialTitularRepository {
    Task<CredencialTitular?> ByTitularIdAsync(Guid titularId, CancellationToken ct);
    Task<CredencialTitular?> ByDocumentoAsync(string documento, CancellationToken ct);
    Task AddAsync(CredencialTitular credencial, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}

public interface IOcorrenciaRepository {
    Task<(IEnumerable<Ocorrencia> Items, int Total)> ListarAsync(OcorrenciaFiltro f, CancellationToken ct);
    Task<Ocorrencia?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Ocorrencia> AddAsync(Ocorrencia o, CancellationToken ct);
    void Update(Ocorrencia o);
    Task SaveChangesAsync(CancellationToken ct);
}
// ISolicitacaoAlteracaoRepository segue o mesmo molde.
```

### Modelos de Dados

**CredencialTitular** (1:1 com `titulares`, tabela `credenciais_titular`):

| Coluna | Tipo | Notas |
|---|---|---|
| `Id` | uuid PK | |
| `TitularId` | uuid FK → titulares | UNIQUE, ON DELETE CASCADE |
| `SenhaHash` | varchar(60) | BCrypt work factor 12 (hash contém salt) |
| `TentativasFalhas` | int | default 0 |
| `BloqueadoAte` | timestamptz? | null quando não bloqueado |
| `CriadoEm` / `AtualizadoEm` | timestamptz | |

**Ocorrencia** (tabela `ocorrencias`) — state machine `ABERTA → EM_ANALISE → RESOLVIDA | CANCELADA`:

| Coluna | Tipo | Notas |
|---|---|---|
| `Id` | uuid PK | |
| `TitularId` | uuid FK | quem abriu |
| `Tipo` | varchar | enum: `TITULARIDADE_DIVERGENTE`, `FONOGRAMA_INCORRETO`, `DADO_CADASTRAL`, `OBRA_AUSENTE` |
| `ObraId?` / `FonogramaId?` | uuid? | referência (quando aplicável) |
| `Descricao` | text | relato livre |
| `Status` | varchar | `ABERTA`/`EM_ANALISE`/`RESOLVIDA`/`CANCELADA` |
| `Resolucao` | text? | parecer do Analista |
| `JustificativaCancelamento` | text? | |
| `AbertaEm` / `ResolvidaEm` | timestamptz | |

Métodos de domínio: `Criar(...)`, `AssumirAnalise()`, `Resolver(parecer)`, `Cancelar(justificativa)` — lançam `DomainException` (→ HTTP 422) em transições inválidas (RF-37).

**SolicitacaoAlteracao** (tabela `solicitacoes_alteracao`) — state machine `SOLICITADA → APROVADA | REJEITADA`:

| Coluna | Tipo |
|---|---|
| `Id`, `TitularId` (FK) | uuid |
| `Campo` | varchar (`NOME`/`CAE_IPI`/`ASSOCIACAO`/`CATEGORIA`) |
| `ValorAtual`, `ValorPretendido` | text |
| `Justificativa` | text |
| `Status` | varchar (`SOLICITADA`/`APROVADA`/`REJEITADA`) |
| `DecisaoPor?`, `DecididaEm?`, `JustificativaRejeicao?` | |

Métodos: `Criar(...)`, `Aprovar(decisaoPor)`, `Rejeitar(decisaoPor, justificativa)`. **RF-20:** `Criar` valida que se `Campo == ASSOCIACAO`, `ValorPretendido` não é vazio (lança `DomainException`).

**Extensão de `Titular`** — adicionar campos de contato (RF-09) + método focado. Endereço é um VO estruturado padrão BR; telefones são uma coleção (titular pode ter vários):

```csharp
public Email? Email { get; private set; }
public Endereco? Endereco { get; private set; }           // VO estruturado (1:1, OwnsOne)
public IReadOnlyList<Telefone> Telefones { get; private set; } = [];  // 0..N (OwnsMany)

public void AtualizarContato(Email? email, Endereco? endereco, IReadOnlyList<Telefone> telefones);
// telefones: substitui a coleção inteira; cap 5 (DomainException se exceder)
```

**Endereco VO** (padrão BR — `3-Domain/ValueObjects/Endereco.cs`):

```csharp
public sealed record Endereco
{
    public Cep Cep { get; }          // VO novo: 8 dígitos, "01001-000" ↔ "01001000"
    public string Logradouro { get; } // "Praça da Sé"
    public string Numero { get; }     // string (aceita "S/N", "KM 12")
    public string? Complemento { get; }
    public string Bairro { get; }
    public string Cidade { get; }      // = localidade ViaCEP
    public Uf Uf { get; }              // VO novo: 2 chars, valida 27 UFs ("sp"→"SP")

    public static Endereco Create(Cep cep, string logradouro, string numero,
        string? complemento, string bairro, string cidade, Uf uf);
}
```

- Persistência: `OwnsOne` no `Titular` → colunas `cep, logradouro, numero, complemento, bairro, cidade, uf` (todas nullable como grupo — titular pode não ter endereço). Mapeamento em `TitularConfiguration` com `OwnsOne(t => t.Endereco, ...)`.

**Telefones (coleção)** — titular pode ter vários (celular, residencial, comercial):

```csharp
public sealed record Telefone(TipoTelefone Tipo, string Numero);  // "(11) 99999-0000"
public enum TipoTelefone { CELULAR, RESIDENCIAL, COMERCIAL }
```

- Persistência: `OwnsMany` → tabela `cadastro.telefones_titular` (`titular_id, tipo, numero, ordem`). Substituição integral no `AtualizarContato` (sem delta parcial).
- Validação: `Numero` via VO `Telefone` (DDD + 8/9 dígitos); máximo 5 por titular.

VOs `Email`/`Telefone`/`Cep`/`Uf` (record, `Create` factory com validação, lança `DomainException`) — espelham `Cpf.cs`. Auditoria two-tier existente (`TitularAuditEventFactory`) já produz diff before/after (incluindo a coleção de telefones), atendendo RF-12 sem código novo.

### Configuração de Autenticação (Program.cs)

Segundo scheme JWT HMAC, mantendo o scheme Keycloak como default:

```csharp
var portalSecret = Environment.GetEnvironmentVariable("PORTAL_JWT_SECRET")
    ?? throw new InvalidOperationException("PORTAL_JWT_SECRET é obrigatório (≥32 bytes).");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => { /* existente — Logto/OIDC */ })
    .AddJwtBearer("Titular", options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true, ValidIssuer = "cadastro-api-portal",
            ValidateAudience = false,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(portalSecret)),
            ValidateIssuerSigningKey = true, ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization(options => {
    options.DefaultPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser().Build();
    options.FallbackPolicy = options.DefaultPolicy;
    options.AddPolicy("PortalTitular", p => p
        .RequireAuthenticatedUser().AddAuthenticationSchemes("Titular").Build());
});
```

Endpoints do titular usam `.RequireAuthorization("PortalTitular")`; auto-cadastro e login usam `.AllowAnonymous()`.

### Endpoints de API

**Portal (titular) — prefixo `/api/v1/portal`, scheme Titular:**

| Método | Caminho | RF | Auth |
|---|---|---|---|
| POST | `/auto-cadastro` | 01,02,03,04 | anônimo |
| POST | `/auth/login` | 05,06 | anônimo |
| GET | `/me` | — | Titular |
| PUT | `/me/contato` | 09,10,11,12,13 | Titular |
| PUT | `/me/senha` | 07 | Titular |
| GET | `/minhas-obras` | 22,24,25,26 | Titular |
| GET | `/meus-fonogramas` | 23,24,25 | Titular |
| POST | `/ocorrencias` | 27,28,32 | Titular |
| GET | `/ocorrencias` | 29,30,31 | Titular |
| POST | `/solicitacoes-alteracao` | 14,15,20 | Titular |
| GET | `/solicitacoes-alteracao` | 17 | Titular |

**Analista — prefixo `/api/v1`, scheme Keycloak + `RequireCadastroPermission`:**

| Método | Caminho | Permissão |
|---|---|---|
| GET | `/ocorrencias` | `cadastro:default:ocorrencia:listar` |
| GET | `/ocorrencias/{id}` | `cadastro:default:ocorrencia:visualizar` |
| POST | `/ocorrencias/{id}/analisar` | `cadastro:default:ocorrencia:analisar` |
| POST | `/ocorrencias/{id}/resolver` | `cadastro:default:ocorrencia:resolver` |
| POST | `/ocorrencias/{id}/cancelar` | `cadastro:default:ocorrencia:cancelar` |
| GET | `/solicitacoes-alteracao` | `cadastro:default:solicitacao-alteracao:listar` |
| POST | `/solicitacoes-alteracao/{id}/aprovar` | `cadastro:default:solicitacao-alteracao:aprovar` |
| POST | `/solicitacoes-alteracao/{id}/rejeitar` | `cadastro:default:solicitacao-alteracao:rejeitar` |

### Fluxo de Login (RF-05, RF-06, RF-07 brute-force)

```
POST /api/v1/portal/auth/login { documento, senha }
  → LoginTitularCommandHandler
      1. Normaliza documento via Cpf.Create/Cnpj.Create (reusa VO existente)
      2. credencial = repo.ByDocumentoAsync(documento)
      3. Se credencial null OU credencial.BloqueadoAte > now → 401 genérico "Credenciais inválidas"
      4. Se !BCrypt.Verify(senha, credencial.SenhaHash):
           credencial.IncrementarFalha()  // 5ª falha → BloqueadoAte = now + 1min (exp. 5/15min)
           repo.SaveChangesAsync(); → 401 genérico
      5. credencial.ResetarFalhas(); repo.SaveChangesAsync()
      6. token = _tokenService.Gerar(titular)
      7. 200 { token, expiraEm, titular: {id, nome} }
```

Mensagem sempre idêntica para "usuário inexistente", "senha errada" e "bloqueado" (RF-06) — via `AutenticacaoTitularException` mapeada a 401 pelo `GlobalExceptionHandler`.

### Fluxo de Aprovação de Solicitação (RF-16, RF-18)

`AprovarSolicitacaoCommandHandler`:
1. Carrega `SolicitacaoAlteracao` (tracked)
2. `solicitacao.Aprovar(analistaId)` — transição de estado
3. **Aplica o efeito colateral** no alvo: `switch Campo` → `titular.Atualizar(...)` / `titular.AtualizarContato(...)` / troca `AssociacaoId`. O dominio revalida invariantes (ex: nova associação existe).
4. Audit publisher registra antes/depois; outbox emite `cadastro.titular.contato.atualizado` quando aplicável.
5. `SaveChangesAsync` (comit entidade + solicitacao + outbox + audit atomicamente).

### Eventos (CloudEvents via Outbox)

Adicionar a `EventTypes.cs`:

| Constante | Routing key | Quando |
|---|---|---|
| `TitularContatoAtualizado` | `cadastro.titular.contato.atualizado` | RF-13 (contato alterado pelo titular) |
| `OcorrenciaAberta` | `cadastro.ocorrencia.aberta` | RF-32 |
| `OcorrenciaResolvida` | `cadastro.ocorrencia.resolvida` | RF-39 |

Publicação via `_outbox.AddEvent(type, subject, payload)` no mesmo `SaveChangesAsync` do handler — atômico, conforme padrão existente.

---

## Pontos de Integração

- **Sem integrações externas novas no backend.** O portal lê/escreve apenas no schema `cadastro`. Nenhum JOIN cross-schema, nenhuma chamada à Distribuição (non-goal explícito do PRD).
- **ViaCEP (auto-preenchimento de endereço — só frontend):** `GET https://viacep.com.br/ws/{cep}/json/` (CEP 8 dígitos, sem auth/chave). Ao perder o foco do campo CEP, o frontend consulta ViaCEP e preenche `logradouro`, `bairro`, `cidade` (localidade), `uf`, `complemento`. CEP inexistente → `{ "erro": true }` (tratar como não-encontrado, campos editáveis manualmente). **O backend NÃO chama ViaCEP** no save — o VO `Cep` valida apenas formato (8 dígitos), evitando acoplar escrita a serviço externo. Uso por demanda (1 chamada/CEP); ViaCEP bloqueia uso massivo.
- **RabbitMQ (exchange `cadastro.events`):** 3 novos routing keys; consumidores existentes (Analytics) ignoram tipos desconhecidos. Sem novos consumers no cadastro-api.
- **Sem IDP externo:** a auth do titular é totalmente interna — o `PORTAL_JWT_SECRET` é a única credencial nova de infra (env var, ≥32 bytes).

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação |
|---|---|---|---|
| `Program.cs` (auth) | Mudança compatível | Adiciona scheme "Titular" + policy "PortalTitular". Default e FallbackPolicy preservados. **Baixo.** | Testar regressão: endpoints internos continuam exigindo Keycloak |
| Entidade `Titular` | Mudança de schema | +7 cols de endereço (`OwnsOne`) + email + tabela `telefones_titular` (`OwnsMany`, 0..5) + método `AtualizarContato`. Nullable → retrocompatível. **Baixo.** | Migration + reprocessar snapshot |
| `CadastroDbContext` | Add DbSet | +3 DbSets (`CredenciaisTitular`, `Ocorrencias`, `SolicitacoesAlteracao`) + configs. **Baixo.** | Migration `AddPortalTitular` |
| `authenticatedFetch.ts` (frontend) | Refator leve | `createAuthenticatedFetchClient(tokenProvider?)` aceita provider por instância; setters singleton viram default do client OIDC. **Médio** (toca 7 arquivos de client, mecânico). | Manter setters OIDC como default; novos clients do portal passam provider próprio |
| `App.tsx` + `routes.tsx` | Add rota `/portal/*` | Novo `PortalAuthProvider` + `PortalLayout` no top-level (sibling de `/`). Não aninha em `ProtectedRoute` OIDC. **Baixo.** | Novos arquivos, sem tocar rotas OIDC |
| `Header.tsx` / `Sidebar.tsx` | Sem impacto | Não reutilizados no PortalLayout. **Baixo.** | — |
| `runtimeConfig.ts` + `runtime-env.template.js` + `40-runtime-env.sh` | Add var | `PORTAL_API_BASE_URL` e `PORTAL_JWT_SECRET` (apenas backend). **Baixo.** | Validar fail-fast no container start |
| Permissões (`CadastroPermissions.cs` + seed) | Add 8 chaves | Novas permissões de analista em `seeds/mcad/cadastro.permissions.json`. **Baixo.** | Sync seed com authz-service |
| LGPD / logs | Sanitização | CPF/CNPJ já parcialmente mascarados por `DocumentoMasking`; logs de login devem logar só `titularId`, nunca documento/senha. **Médio.** | Revisar scopes de log nos handlers |

---

## Abordagem de Testes

### Unitários (`Cadastro.UnitTests`, xUnit + Moq + AwesomeAssertions)

| Handler | Cenários críticos |
|---|---|
| `AutoCadastroTitularCommandHandler` | CPF+CAE válidos → cria credencial; titular inexistente → `DomainException`; credencial já existe → `ConflictException`; senha hasheada (não em texto plano) |
| `LoginTitularCommandHandler` | sucesso → token; usuário inexistente → genérico 401; senha errada → genérico + incrementa falha; 5ª falha → bloqueio; bloqueado → genérico |
| `AtualizarContatoCommandHandler` | e-mail inválido → `DomainException`; CEP com formato inválido → `DomainException`; UF inexistente → `DomainException`; >5 telefones → `DomainException`; sucesso → audit + outbox `cadastro.titular.contato.atualizado` |
| `CriarOcorrenciaCommandHandler` | nasce `ABERTA`; emite `cadastro.ocorrencia.aberta` |
| State machine `Ocorrencia` | `ABERTA→EM_ANALISE` ok; `RESOLVIDA→ABERTA` → `DomainException` |
| `AbrirSolicitacaoCommandHandler` | campo `ASSOCIACAO` sem destino → `DomainException` (RF-20); demais campos ok |
| `AprovarSolicitacaoCommandHandler` | aprovada → aplica efeito no titular + audit; rejeitada registra justificativa; transição inválida → erro |

Mockar apenas `ITitularTokenService`, `ICurrentTitular` e repositórios externos — regras de domínio testadas sem I/O.

### Integração (`Cadastro.IntegrationTests`, WebApplicationFactory + Testcontainers PostgreSQL)

Estender `CadastroApiFactory` com um `TestTitularAuthHandler` (espelha `TestAuthHandler`, injeta claims `sub=titularId` no scheme "Titular"). Cobrir:

- Fluxo HTTP completo: auto-cadastro → login → `GET /portal/me` → `PUT /portal/me/contato` → `GET /portal/minhas-obras` retorna só obras do titular (RF-24).
- Isolamento: titular A não acessa `GET /portal/ocorrencias/{id-do-B}` → 403/404.
- Lockout exponencial após 5 logins falhados na mesma conta.
- Analista (scheme Keycloak via `X-Test-Permissions`) move ocorrência `EM_ANALISE → RESOLVIDA`; sem permissão → 403.
- Eventos Outbox: após `POST /portal/ocorrencias`, row em `outbox_events` com type `cadastro.ocorrencia.aberta`.
- Auto-cadastro e login acessíveis sem token; demais endpoints `/portal/*` sem token → 401.

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Domínio + migration** — VOs `Email`/`Telefone`, entidades `CredencialTitular`/`Ocorrencia`/`SolicitacaoAlteracao`, extensão de `Titular`, configs EF, migration `AddPortalTitular`. *Sem dependência; habilita tudo o resto.*
2. **Auth do titular** — `ITitularTokenService`, scheme "Titular" em `Program.cs`, `ICurrentTitular`, `AutoCadastroTitular` + `LoginTitular` + `AlterarSenha` (handlers/endpoints). *Depende de 1.*
3. **Gestão de contato** — `AtualizarContato` handler + endpoint, evento outbox. *Depende de 1, 2.*
4. **Consulta de repertório** — queries `ObterMinhasObras`/`ObterMeusFonogramas` (reusam `ITitularidadeRepository`/`IParticipacaoRepository` filtrados por `titularId`). *Depende de 2.*
5. **Ocorrências (titular + analista)** — CRUD titular + triagem analista + state machine + eventos. *Depende de 1, 2.*
6. **Solicitações de alteração sensível** — abrir (titular) + aprovar/rejeitar (analista) + aplicação de efeito. *Depende de 1, 2.*
7. **Permissões + seed** — 8 chaves em `CadastroPermissions.cs` + `cadastro.permissions.json`.
8. **Frontend** — `PortalAuthProvider`, `PortalLayout`, refator do `authenticatedFetch`, páginas (auto-cadastro, login, dashboard do titular, contato, repertório, ocorrências, solicitações), aviso de janela de distribuição (RF-21). *Depende de 2-7.*
9. **Testes + observabilidade** — unit + integração + scopes de log/métricas.

### Dependências Técnicas

- **`BCrypt.Net-Next`** (NuGet, projeto Infra ou Application) — hash de senha work factor 12.
- **`PORTAL_JWT_SECRET`** (env, ≥32 bytes) — configurar em `.env`, `docker-compose.dev.yml`, `40-runtime-env.sh`.
- **`AUTH_ENABLED=false`** continua desabilitando auth fina do Keycloak, mas o scheme Titular permanece ativo em dev (ou também gated por flag — definir no handler de teste).

---

## Monitoramento e Observabilidade

- **Logs estruturados:** handlers de login/contato/solicitação usam `ILogger` com `LogScope("{TitularId}", titularId)`. **Nunca logar CPF/CNPJ/senha** — sanitização conforme `dotnet-production-readiness`.
- **Métricas Prometheus (`Prometheus.AspNetCore.HttpMetrics` já presente):** expor contadores `portal_login_attempts_total{result="success|invalid|locked"}`, `portal_ocorrencias_abertas_total`, `portal_solicitacoes_aprovadas_total`.
- **Health checks:** sem novo check (DB/RabbitMQ já cobertos). O scheme Titular não adiciona dependência externa.
- **Trace:** `traceparent` já propagado por `HttpAuditContextProvider`; fluxos do titular entram na mesma correlação.

---

## Considerações Técnicas

### Decisões Principais

1. **Auth interna via JWT HMAC (não Keycloak)** — decisão do PRD (motivo econômico/operacional). HMAC-SHA256 com `PORTAL_JWT_SECRET` evita par de chaves/infra de IDP para um público potencialmente grande; TTL 60min sem refresh na PoC (re-login).
2. **Mesmo schema `cadastro`, tabela isolada `credenciais_titular`** — mantém Schema-per-Service (visão/arquitetura); isola coluna sensível `SenhaHash` em tabela própria (grants restritos por role PostgreSQL) sem introduzir microserviço de auth.
3. **BCrypt em vez de Argon2id** — BCrypt.Net-Next é maduro, sal embutido no hash, work factor configurável. Argon2id seria o upgrade futuro (OWASP prefere), mas adiciona complexidade sem ganho mensurável na PoC.
4. **Rota `/portal/*` no mesmo SPA** — custo de CI/deploy menor que um segundo Vite app; refator do `authenticatedFetch` é mecânica e benfica (acoplamento atual é code smell).
5. **Lockout exponencial na própria `credencial_titular`** — sem infra de rate-limit externa; 5 falhas → 1min, depois 5min, 15min. Mensagem genérica preserva RF-06.
6. **Sem recuperação de senha na PoC** (RF-08 adiado) — reset manual pelo Analista via endpoint interno (futuro).
7. **Consulta de repertório direto no serviço** (não BFF) — dados já estão no schema cadastro; BFF adicionaria hop e exigiria extensão para o token do titular.
8. **Endereco como VO estruturado padrão BR** (Cep/Logradouro/Numero/Complemento/Bairro/Cidade/Uf), não string livre — endereço livre era pobrezinho e impedia validação/consulta por UF/cidade. VOs `Cep` e `Uf` novos validam formato; persistência via `OwnsOne` (colunas inline no titular).
9. **Telefones múltiplos com tipo** (`TipoTelefone` enum, coleção `OwnsMany` cap 5) — titular pode ter celular + residencial + comercial. Substituição integral da coleção no `AtualizarContato` (sem delta parcial); auditoria two-tier captura o diff.
10. **ViaCEP só no frontend** — auto-preenchimento de endereço ao digitar CEP (UX). Backend valida apenas formato do CEP no VO, sem chamada externa no save — evita acoplar escrita a serviço de terceiro (latência, indisponibilidade bloquearia persistência).

### Riscos Conhecidos

| Risco | Mitigação |
|---|---|
| `PORTAL_JWT_SECRET` vazar = tokens forjados | Carregar de secret manager em prod; rotacionável; TTL curto; logar emissão |
| Brute-force distribuído por IP | Lockout por conta mitiga conta-alvo; rate-limit por IP é upgrade futuro (Q-07 parcial) |
| Colisão entre setters de token OIDC e Titular no frontend | Refator `createAuthenticatedFetchClient(tokenProvider?)` com default OIDC; clients do portal passam provider próprio |
| Aplicação de efeito na `AprovarSolicitacao` quebrar invariante (ex: associação inválida) | Handler revalida via repositório; `DomainException` → 422; solicitação fica inconsistência only em memória (não persiste) |
| Eventos novos não consumidos ainda | Sem consumidor hoje (Q-06); Analytics ignora tipos desconhecidos; contrato documentado no AsyncAPI |

### Conformidade com Padrões

- **Clean Architecture** (camadas 1-5, dependências inward-pointing): ✅ novas entidades no `3-Domain`, handlers no `2-Application`, EF configs no `4-Infra`, endpoints no `1-Services`.
- **CQRS nativo** (sem MediatR): ✅ Commands/Queries `record`, handlers `ICommandHandler<,>`, validação FluentValidation no `Dispatcher`.
- **Outbox Pattern + CloudEvents 1.0**: ✅ 3 novos eventos via `IOutboxEventWriter.AddEvent` + `OutboxPublisherWorker`.
- **Schema-per-Service**: ✅ tudo em `cadastro`; sem JOIN cross-schema.
- **Permissões 4-segmentos** (`dominio:area:recurso:acao`): ✅ 8 novas chaves em `CadastroPermissions.cs`.
- **Auditoria two-tier**: ✅ reutiliza `EfAuditOutboxClient` + publishers por entidade.
- **LGPD**: ✅ senhas só como hash; CPF/CNPJ mascarados em logs/respostas; `DocumentoMasking` reutilizado.
- **Tratamento de erros RFC 7807**: ✅ `GlobalExceptionHandler` mapeia `DomainException`→422, `ConflictException`→409, `AutenticacaoTitularException`→401.

---

## Resolução das Questões em Aberto (PRD)

| Q | Decisão |
|---|---|
| Q-01 | Rota `/portal/*` no mesmo SPA, com `PortalAuthProvider` + `PortalLayout` próprios + refator leve do `authenticatedFetch`. |
| Q-02 | JWT HMAC-SHA256 assinado pelo cadastro-api, TTL 60min, claim `sub=titularId`. Sem refresh na PoC. |
| Q-03 | Sem recuperação de senha na PoC (RF-08 adiado). Reset manual pelo Analista. |
| Q-04 | Tabela `credenciais_titular` no schema `cadastro` (1:1), coluna `senha_hash` isolada. |
| Q-05 | Direto no cadastro-api, endpoints `/api/v1/portal/minhas-obras` e `/meus-fonogramas` filtrando por `titularId` do token. |
| Q-06 | Eventos publicados mas sem consumidor neste PRD; contrato documentado no AsyncAPI para consumo futuro por Analytics. |
| Q-07 | Lockout exponencial após 5 falhas (1/5/15min) rastreado em `credenciais_titular`. Rate-limit por IP = upgrade futuro. |

---

*Tech Spec gerada seguindo a skill `ai-techspec-creator`. Próxima etapa: gerar tasks com `ai-tasks-creator`.*
