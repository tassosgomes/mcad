# Plano de Migração de Autorização do MCAD para `ecad-authz`

> **Objetivo:** migrar o sistema MCAD do modelo atual baseado em scopes/roles genéricos para o modelo centralizado de autorização fina do `ecad-authz`.
>
> **Escopo:** aplicar a migração em todas as APIs do sistema:
>
> * `cadastro-api`
> * `identificacao-api`
> * `arrecadacao-api`
> * `distribuicao-api`
>
> **Contexto importante:** o sistema ainda não está em produção. Portanto, a migração pode ser feita de forma direta, sem necessidade de convivência longa com o modelo antigo.

---

## 1. Estado Atual

O MCAD já possui autenticação baseada em OIDC/OAuth, atualmente usando Logto como provedor de identidade.

O desenho atual é agnóstico o suficiente para manter Logto como provedor de autenticação e deslocar a autorização fina para o `ecad-authz`.

Atualmente, o backend usa autorização por scopes genéricos:

```csharp
options.AddPolicy("read", policy => policy.RequireClaim("scope", "access"));
options.AddPolicy("write", policy => policy.RequireClaim("scope", "write"));
```

Esse modelo deve ser substituído por permissões explícitas no formato:

```text
dominio:recurso:acao
```

Exemplos:

```text
cadastro:obra:criar
identificacao:obra:validar
arrecadacao:cobranca:emitir
distribuicao:roteiro:processar
```

---

## 2. Modelo Alvo

### 2.1 Responsabilidades

```text
Logto
  - autenticação
  - identidade
  - emissão de tokens OIDC/OAuth
  - sessão do usuário

BFF
  - fronteira do frontend
  - sessão/cookie/token handling
  - endpoint /api/me
  - endpoint /api/me/permissions
  - proxy para APIs internas

ecad-authz
  - fonte autoritativa de papéis
  - fonte autoritativa de permissões
  - composição de políticas
  - decisão permit/deny

APIs de domínio
  - validam identidade
  - consultam ecad-authz via SDK
  - protegem endpoints por permissão fina

Frontend React
  - usa permissões apenas para UX
  - oculta menus/botões/rotas sem permissão
  - nunca é fonte de segurança
```

### 2.2 Fluxo alvo

```text
Usuário
  -> Frontend React
  -> BFF
  -> API de domínio
  -> SDK .NET/Java
  -> ecad-authz
  -> decisão permit/deny
```

### 2.3 Regra principal

Nenhuma API deve decidir autorização de negócio usando apenas:

```text
scope=access
scope=write
role=analista-*
role=consultor-*
```

Esses dados podem continuar existindo no Logto como apoio de identidade, agrupamento ou acesso grosso, mas a decisão final de autorização fina deve vir do `ecad-authz`.

---

## 3. Convenção de Permissões

Todas as permissões devem seguir a convenção:

```text
{dominio}:{recurso}:{acao}
```

### 3.1 Domínios iniciais

```text
cadastro
identificacao
arrecadacao
distribuicao
```

### 3.2 Regras de nomenclatura

* Usar sempre minúsculo.
* Não usar acentos.
* Não usar espaços.
* Usar hífen apenas quando necessário para ação composta.
* Preferir nomes de ação no infinitivo.
* Não criar permissões genéricas como `cadastro:*:*` no código da API.
* Papéis podem agrupar permissões, mas endpoints devem exigir permissões explícitas.

Exemplos válidos:

```text
cadastro:obra:criar
cadastro:titular:editar
identificacao:obra:analisar
arrecadacao:cobranca:cancelar
distribuicao:roteiro:reprocessar
```

Exemplos inválidos:

```text
write
read
admin
analista-cadastro
cadastro:write
cadastro:obra:*
```

---

## 4. Catálogo Inicial de Permissões

> Observação: o catálogo abaixo deve ser validado contra os endpoints reais de cada API. O objetivo inicial é substituir `read/write` por permissões finas com granularidade suficiente para evolução.

---

## 4.1 Cadastro API

### Associação

```text
cadastro:associacao:listar
cadastro:associacao:visualizar
```

### Titular

```text
cadastro:titular:listar
cadastro:titular:visualizar
cadastro:titular:buscar
cadastro:titular:criar
cadastro:titular:editar
cadastro:titular:excluir
```

### Obra

```text
cadastro:obra:listar
cadastro:obra:visualizar
cadastro:obra:criar
cadastro:obra:editar
cadastro:obra:excluir
cadastro:obra:gerar-iswc
cadastro:obra:depurar
cadastro:obra:dp
```

### Titularidade

```text
cadastro:titularidade:listar
cadastro:titularidade:buscar
cadastro:titularidade:adicionar
cadastro:titularidade:editar
cadastro:titularidade:remover
```

### Fonograma

```text
cadastro:fonograma:listar
cadastro:fonograma:visualizar
cadastro:fonograma:listar-por-obra
cadastro:fonograma:criar
cadastro:fonograma:editar
cadastro:fonograma:excluir
cadastro:fonograma:depurar
```

### Participação

```text
cadastro:participacao:listar
cadastro:participacao:adicionar
cadastro:participacao:ajustar
cadastro:participacao:remover
cadastro:participacao:calcular
```

### Status

```text
cadastro:status:visualizar-historico-obra
cadastro:status:visualizar-historico-fonograma
cadastro:status:liberar-obra
cadastro:status:bloquear-obra
cadastro:status:desbloquear-obra
cadastro:status:liberar-fonograma
cadastro:status:bloquear-fonograma
cadastro:status:desbloquear-fonograma
```

---

## 4.2 Identificação API

> Ajustar os nomes conforme os endpoints reais da API.

### Obras / Identificação

```text
identificacao:obra:listar
identificacao:obra:visualizar
identificacao:obra:buscar
identificacao:obra:analisar
identificacao:obra:validar
identificacao:obra:rejeitar
identificacao:obra:enviar-para-cadastro
identificacao:obra:consultar-cadastro
```

### Conflitos

```text
identificacao:conflito:listar
identificacao:conflito:visualizar
identificacao:conflito:resolver
identificacao:conflito:reabrir
```

### Lotes / Processamentos

```text
identificacao:lote:listar
identificacao:lote:visualizar
identificacao:lote:importar
identificacao:lote:processar
identificacao:lote:cancelar
```

### Relatórios

```text
identificacao:relatorio:visualizar
identificacao:relatorio:exportar
```

---

## 4.3 Arrecadação API

> Ajustar os nomes conforme os endpoints reais da API.

### Cliente / Usuário de música / Pagador

```text
arrecadacao:cliente:listar
arrecadacao:cliente:visualizar
arrecadacao:cliente:criar
arrecadacao:cliente:editar
arrecadacao:cliente:excluir
```

### Contrato / Licença

```text
arrecadacao:contrato:listar
arrecadacao:contrato:visualizar
arrecadacao:contrato:criar
arrecadacao:contrato:editar
arrecadacao:contrato:cancelar
arrecadacao:contrato:renovar
```

### Cobrança

```text
arrecadacao:cobranca:listar
arrecadacao:cobranca:visualizar
arrecadacao:cobranca:emitir
arrecadacao:cobranca:reemitir
arrecadacao:cobranca:cancelar
arrecadacao:cobranca:baixar
```

### Pagamento

```text
arrecadacao:pagamento:listar
arrecadacao:pagamento:visualizar
arrecadacao:pagamento:conciliar
arrecadacao:pagamento:estornar
```

### Relatórios

```text
arrecadacao:relatorio:visualizar
arrecadacao:relatorio:exportar
```

---

## 4.4 Distribuição API

> Ajustar os nomes conforme os endpoints reais da API.

### Roteiro / Processamento

```text
distribuicao:roteiro:listar
distribuicao:roteiro:visualizar
distribuicao:roteiro:criar
distribuicao:roteiro:processar
distribuicao:roteiro:reprocessar
distribuicao:roteiro:cancelar
distribuicao:roteiro:fechar
```

### Beneficiário / Titular / Participante

```text
distribuicao:beneficiario:listar
distribuicao:beneficiario:visualizar
distribuicao:beneficiario:validar
```

### Cálculo

```text
distribuicao:calculo:listar
distribuicao:calculo:visualizar
distribuicao:calculo:executar
distribuicao:calculo:recalcular
distribuicao:calculo:aprovar
distribuicao:calculo:cancelar
```

### Pagamento / Repasse

```text
distribuicao:repasse:listar
distribuicao:repasse:visualizar
distribuicao:repasse:gerar
distribuicao:repasse:aprovar
distribuicao:repasse:cancelar
```

### Relatórios

```text
distribuicao:relatorio:visualizar
distribuicao:relatorio:exportar
```

---

## 5. Papéis Iniciais

### 5.1 Papéis por domínio

Criar inicialmente papéis separados por domínio:

```text
cadastro.consultor
cadastro.analista

identificacao.consultor
identificacao.analista

arrecadacao.consultor
arrecadacao.analista

distribuicao.consultor
distribuicao.analista
```

### 5.2 Regra geral dos papéis

* `*.consultor`: permissões de leitura, visualização, busca e exportação quando aplicável.
* `*.analista`: herda permissões de consultor e adiciona permissões de escrita, execução, alteração de status e processamento.

### 5.3 Exemplo de composição

```yaml
roles:
  cadastro.consultor:
    permissions:
      - cadastro:associacao:listar
      - cadastro:associacao:visualizar
      - cadastro:titular:listar
      - cadastro:titular:visualizar
      - cadastro:titular:buscar
      - cadastro:obra:listar
      - cadastro:obra:visualizar
      - cadastro:titularidade:listar
      - cadastro:titularidade:buscar
      - cadastro:fonograma:listar
      - cadastro:fonograma:visualizar
      - cadastro:fonograma:listar-por-obra
      - cadastro:participacao:listar
      - cadastro:status:visualizar-historico-obra
      - cadastro:status:visualizar-historico-fonograma

  cadastro.analista:
    inheritsFrom:
      - cadastro.consultor
    permissions:
      - cadastro:titular:criar
      - cadastro:titular:editar
      - cadastro:titular:excluir
      - cadastro:obra:criar
      - cadastro:obra:editar
      - cadastro:obra:excluir
      - cadastro:obra:gerar-iswc
      - cadastro:obra:depurar
      - cadastro:obra:dp
      - cadastro:titularidade:adicionar
      - cadastro:titularidade:editar
      - cadastro:titularidade:remover
      - cadastro:fonograma:criar
      - cadastro:fonograma:editar
      - cadastro:fonograma:excluir
      - cadastro:fonograma:depurar
      - cadastro:participacao:adicionar
      - cadastro:participacao:ajustar
      - cadastro:participacao:remover
      - cadastro:participacao:calcular
      - cadastro:status:liberar-obra
      - cadastro:status:bloquear-obra
      - cadastro:status:desbloquear-obra
      - cadastro:status:liberar-fonograma
      - cadastro:status:bloquear-fonograma
      - cadastro:status:desbloquear-fonograma
```

---

## 6. SDK .NET do `ecad-authz`

## 6.1 Objetivo

Criar SDK .NET para uso nas APIs do MCAD, começando por `cadastro-api`, mas preparado para `identificacao-api`, `arrecadacao-api` e `distribuicao-api`.

## 6.2 Pacotes sugeridos

```text
Ecad.Authz.Sdk
Ecad.Authz.AspNetCore
```

## 6.3 Contrato base

```csharp
public interface IEcadAuthzClient
{
    Task<AuthzDecision> CheckAsync(
        AuthzCheckRequest request,
        CancellationToken cancellationToken = default);
}

public sealed record AuthzCheckRequest(
    string SubjectId,
    string Permission,
    string? TenantId = null,
    IDictionary<string, object?>? Context = null);

public sealed record AuthzDecision(
    bool Allowed,
    string? Reason = null);
```

## 6.4 Recursos obrigatórios

* Client HTTP para o `ecad-authz`.
* Extração padronizada do usuário autenticado.
* Suporte a `RequirePermission` em Minimal APIs.
* Cache local com TTL curto.
* Configuração via `IConfiguration`.
* Logs estruturados.
* Fail closed para escrita.
* Testes unitários.
* Testes de integração com fake server ou mock HTTP.

## 6.5 Configuração esperada

```json
{
  "EcadAuthz": {
    "BaseUrl": "http://localhost:8085",
    "TimeoutSeconds": 3,
    "CacheTtlSeconds": 60,
    "Enabled": true
  }
}
```

## 6.6 Registro no ASP.NET Core

```csharp
builder.Services.AddEcadAuthz(builder.Configuration);
```

## 6.7 Uso esperado nos endpoints

```csharp
group.MapGet("/", ListarObras)
    .RequirePermission("cadastro:obra:listar");

group.MapPost("/", CriarObra)
    .RequirePermission("cadastro:obra:criar");
```

---

## 7. BFF

## 7.1 Objetivo

Virar o frontend para o BFF e remover do React a responsabilidade de chamar APIs internas diretamente com access token.

## 7.2 Endpoints obrigatórios no BFF

```http
GET /api/me
GET /api/me/permissions
```

## 7.3 Resposta esperada de `/api/me`

```json
{
  "subjectId": "user-id",
  "name": "Nome do Usuário",
  "email": "usuario@exemplo.com"
}
```

## 7.4 Resposta esperada de `/api/me/permissions`

```json
{
  "subjectId": "user-id",
  "permissions": [
    "cadastro:obra:listar",
    "cadastro:obra:visualizar",
    "cadastro:obra:criar"
  ]
}
```

## 7.5 Regras

* Frontend chama BFF.
* BFF consulta `ecad-authz` para obter permissões do usuário.
* BFF pode cachear permissões por sessão por TTL curto.
* APIs continuam validando autorização no backend.
* Permissões no frontend são apenas para UX.

---

## 8. Frontend React

## 8.1 Objetivo

Trocar autorização de tela baseada em role/scope por autorização baseada em permissões.

## 8.2 API alvo

```typescript
const { can, permissions, isLoading } = usePermissions();

can('cadastro:obra:criar');
can('cadastro:titular:editar');
can('distribuicao:roteiro:processar');
```

## 8.3 Componentes esperados

```text
frontend/src/shared/authz/PermissionsProvider.tsx
frontend/src/shared/authz/usePermissions.ts
frontend/src/shared/authz/Can.tsx
```

## 8.4 Exemplo de componente `Can`

```tsx
<Can permission="cadastro:obra:criar">
  <Button>Nova Obra</Button>
</Can>
```

## 8.5 Regra

Remover usos de:

```typescript
hasRole('analista-cadastro')
hasRole('consultor')
```

Substituir por:

```typescript
can('cadastro:obra:criar')
can('cadastro:titular:editar')
```

---

# 9. Plano de Execução por Tarefas

---

## Tarefa 1 — Atualizar documentação arquitetural

### Objetivo

Alinhar a documentação ao modelo real: Logto + BFF + `ecad-authz`.

### Ações

* Atualizar `docs/architecture/auth-plan.md`.
* Criar `docs/architecture/authz-migration-plan.md`.
* Remover referências obsoletas a Keycloak como provedor atual.
* Registrar Logto como provedor OIDC/OAuth atual.
* Registrar que a autorização fina será responsabilidade do `ecad-authz`.
* Registrar que `read/write` serão removidos como autorização de negócio.

### Critérios de aceite

* Documento explica claramente a separação autenticação vs autorização.
* Documento cita as 4 APIs.
* Documento cita BFF como fronteira do frontend.
* Documento cita SDK .NET como dependência da migração.

---

## Tarefa 2 — Criar catálogo de permissões por API

### Objetivo

Criar catálogo versionado de permissões para as 4 APIs.

### Ações

Criar arquivos:

```text
docs/authz/catalog/cadastro.md
docs/authz/catalog/identificacao.md
docs/authz/catalog/arrecadacao.md
docs/authz/catalog/distribuicao.md
```

Cada arquivo deve conter tabela no formato:

```markdown
| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| cadastro:obra:listar | Lista obras | GET | /obras | cadastro.consultor |
```

### Critérios de aceite

* Todas as permissões seguem `dominio:recurso:acao`.
* Todas as APIs possuem catálogo inicial.
* Permissões de Cadastro refletem os endpoints atuais.
* Permissões das demais APIs estão mapeadas ao melhor conhecimento atual e marcadas para validação contra endpoints reais quando necessário.

---

## Tarefa 3 — Criar mapa de papéis e permissões

### Objetivo

Criar os papéis iniciais por domínio e mapear permissões.

### Ações

Criar arquivo:

```text
docs/authz/role-permission-map.md
```

Papéis obrigatórios:

```text
cadastro.consultor
cadastro.analista
identificacao.consultor
identificacao.analista
arrecadacao.consultor
arrecadacao.analista
distribuicao.consultor
distribuicao.analista
```

### Critérios de aceite

* Cada papel possui lista explícita de permissões.
* Papéis `*.analista` incluem permissões de escrita/processamento.
* Papéis `*.consultor` incluem permissões de leitura/consulta.
* Não usar `*:*:*`.

---

## Tarefa 4 — Criar seeds no `ecad-authz`

### Objetivo

Permitir que o ambiente local suba com permissões e papéis do MCAD já cadastrados.

### Ações

Criar seeds:

```text
seeds/mcad/cadastro.permissions.json
seeds/mcad/identificacao.permissions.json
seeds/mcad/arrecadacao.permissions.json
seeds/mcad/distribuicao.permissions.json
seeds/mcad/roles.json
seeds/mcad/assignments.json
```

### Critérios de aceite

* Seeds criam permissões das 4 APIs.
* Seeds criam papéis iniciais.
* Seeds associam permissões a papéis.
* Seeds criam usuários/grupos de teste equivalentes aos perfis atuais.
* Seed pode ser executado mais de uma vez sem duplicar dados.

---

## Tarefa 5 — Criar SDK .NET `Ecad.Authz.Sdk`

### Objetivo

Criar client .NET independente de ASP.NET Core para comunicação com `ecad-authz`.

### Ações

Criar projeto:

```text
src/Ecad.Authz.Sdk
```

Implementar:

```text
IEcadAuthzClient
AuthzCheckRequest
AuthzDecision
EcadAuthzOptions
HttpEcadAuthzClient
```

### Critérios de aceite

* Client usa `HttpClient` via DI.
* Timeout configurável.
* BaseUrl configurável.
* Serialização JSON padronizada.
* Erros de rede são tratados.
* Testes unitários cobrem sucesso, deny, timeout e erro remoto.

---

## Tarefa 6 — Criar SDK ASP.NET Core `Ecad.Authz.AspNetCore`

### Objetivo

Criar integração do SDK com ASP.NET Core e Minimal APIs.

### Ações

Criar projeto:

```text
src/Ecad.Authz.AspNetCore
```

Implementar:

```text
AddEcadAuthz(...)
RequirePermission(...)
PermissionRequirement
PermissionAuthorizationHandler
SubjectResolver
```

### Critérios de aceite

* `RequirePermission("x:y:z")` funciona em Minimal APIs.
* Handler consulta `IEcadAuthzClient`.
* Handler extrai subject do usuário autenticado.
* Handler nega acesso se usuário não estiver autenticado.
* Handler nega acesso se `ecad-authz` negar.
* Testes cobrem 200/403/401.

---

## Tarefa 7 — Adicionar cache no SDK .NET

### Objetivo

Evitar chamada remota ao `ecad-authz` em toda requisição.

### Ações

* Adicionar `IMemoryCache`.
* Cachear por:

```text
subjectId + permission + tenantId + contextHash
```

* TTL configurável por `EcadAuthz:CacheTtlSeconds`.
* Não cachear erro técnico por padrão.
* Cachear deny por TTL curto se configurado.

### Critérios de aceite

* Chamadas repetidas usam cache.
* Cache respeita TTL.
* Contextos diferentes geram chaves diferentes.
* Testes cobrem cache hit e cache miss.

---

## Tarefa 8 — Integrar SDK .NET no `cadastro-api`

### Objetivo

Migrar `cadastro-api` de `read/write` para permissões finas.

### Ações

* Registrar `AddEcadAuthz(builder.Configuration)`.
* Remover policies `read` e `write` como regra de negócio.
* Manter autenticação OIDC/JWT.
* Aplicar `RequirePermission` em todos os endpoints.
* Atualizar variáveis de ambiente.

### Critérios de aceite

* Nenhum endpoint de negócio usa `RequireAuthorization("read")`.
* Nenhum endpoint de negócio usa `RequireAuthorization("write")`.
* Todos os endpoints protegidos usam `RequirePermission`.
* Health checks e documentação continuam públicos quando aplicável.
* Testes 401/403/200 por permissão passam.

---

## Tarefa 9 — Integrar SDK na `identificacao-api`

### Objetivo

Aplicar o mesmo modelo de autorização fina na API de Identificação.

### Ações

* Registrar `AddEcadAuthz(builder.Configuration)`.
* Mapear endpoints para permissões `identificacao:*:*`.
* Substituir autorização baseada em scope/role por `RequirePermission`.
* Criar testes de autorização.

### Critérios de aceite

* Todos os endpoints protegidos usam permissões explícitas.
* Nenhuma decisão de negócio usa `scope=access/write`.
* Testes cobrem usuário sem permissão, consultor e analista.

---

## Tarefa 10 — Integrar SDK na `arrecadacao-api`

### Objetivo

Aplicar o mesmo modelo de autorização fina na API de Arrecadação.

### Ações

* Registrar `AddEcadAuthz(builder.Configuration)`.
* Mapear endpoints para permissões `arrecadacao:*:*`.
* Substituir autorização baseada em scope/role por `RequirePermission`.
* Criar testes de autorização.

### Critérios de aceite

* Todos os endpoints protegidos usam permissões explícitas.
* Nenhuma decisão de negócio usa `scope=access/write`.
* Testes cobrem usuário sem permissão, consultor e analista.

---

## Tarefa 11 — Integrar SDK na `distribuicao-api`

### Objetivo

Aplicar o mesmo modelo de autorização fina na API de Distribuição.

### Ações

* Registrar `AddEcadAuthz(builder.Configuration)`.
* Mapear endpoints para permissões `distribuicao:*:*`.
* Substituir autorização baseada em scope/role por `RequirePermission`.
* Criar testes de autorização.

### Critérios de aceite

* Todos os endpoints protegidos usam permissões explícitas.
* Nenhuma decisão de negócio usa `scope=access/write`.
* Testes cobrem usuário sem permissão, consultor e analista.

---

## Tarefa 12 — Virar frontend para BFF

### Objetivo

Garantir que o React chama o BFF, não as APIs internas diretamente.

### Ações

* Validar `runtimeConfig` para apontar para rotas do BFF.
* Remover dependência de enviar access token diretamente para cada API, se o BFF assumir sessão/cookie.
* Ajustar `apiClient` para operar contra o BFF.
* Garantir que chamadas para Cadastro, Identificação, Arrecadação e Distribuição passem pelo BFF.

### Critérios de aceite

* Frontend não chama diretamente hosts internos das APIs.
* Frontend usa caminhos `/api/...` atendidos pelo BFF.
* Autenticação/sessão é tratada pelo BFF conforme arquitetura escolhida.

---

## Tarefa 13 — Criar `/api/me` e `/api/me/permissions` no BFF

### Objetivo

Permitir que o frontend conheça o usuário e suas permissões para UX.

### Ações

* Criar endpoint `GET /api/me`.
* Criar endpoint `GET /api/me/permissions`.
* BFF consulta `ecad-authz` para listar permissões efetivas.
* Cachear permissões por sessão/usuário com TTL curto.

### Critérios de aceite

* `/api/me` retorna dados básicos do usuário autenticado.
* `/api/me/permissions` retorna lista de permissões efetivas.
* Usuário não autenticado recebe 401.
* Frontend consegue consumir esses endpoints.

---

## Tarefa 14 — Adaptar React para `usePermissions`

### Objetivo

Substituir lógica de role por lógica de permissão.

### Ações

Criar:

```text
frontend/src/shared/authz/PermissionsProvider.tsx
frontend/src/shared/authz/usePermissions.ts
frontend/src/shared/authz/Can.tsx
```

Substituir:

```typescript
hasRole('analista-cadastro')
hasRole('consultor')
```

Por:

```typescript
can('cadastro:obra:criar')
can('cadastro:titular:editar')
can('identificacao:obra:validar')
can('arrecadacao:cobranca:emitir')
can('distribuicao:roteiro:processar')
```

### Critérios de aceite

* Menus são controlados por permissões.
* Botões são controlados por permissões.
* Rotas protegidas usam permissões quando aplicável.
* Nenhum componente usa role como autorização de negócio.

---

## Tarefa 15 — Padronizar contrato entre SDKs Java, React e .NET

### Objetivo

Garantir que todos os SDKs usam o mesmo vocabulário e payloads.

### Ações

Criar contratos compartilhados:

```text
contracts/authz-check-request.schema.json
contracts/authz-check-response.schema.json
contracts/effective-permissions-response.schema.json
```

Exemplo de check:

```json
{
  "subjectId": "user-id",
  "permission": "cadastro:obra:criar",
  "tenantId": null,
  "context": {}
}
```

Exemplo de response:

```json
{
  "allowed": true,
  "reason": null
}
```

### Critérios de aceite

* SDK Java segue o contrato.
* SDK .NET segue o contrato.
* React/BFF usam o contrato de permissões efetivas.
* Existem exemplos JSON versionados.

---

## Tarefa 16 — Atualizar ambiente local

### Objetivo

Subir localmente Logto + BFF + `ecad-authz` + 4 APIs.

### Ações

Atualizar:

```text
.env.example
docker-compose.dev.yml
scripts/seed-authz.sh
scripts/provision-logto.sh
```

Adicionar variáveis:

```text
AUTHZ_BASE_URL
AUTHZ_TIMEOUT_SECONDS
AUTHZ_CACHE_TTL_SECONDS
OIDC_AUTHORITY
OIDC_AUDIENCE
```

### Critérios de aceite

* Ambiente local sobe com um comando documentado.
* Seeds do `ecad-authz` são aplicados.
* Usuários de teste conseguem logar.
* Consultor acessa leitura.
* Analista acessa leitura e escrita.
* Usuário sem papel recebe 403 nas APIs.

---

## Tarefa 17 — Criar testes de autorização por API

### Objetivo

Validar o modelo novo nas 4 APIs.

### Ações

Criar testes para cada API:

```text
sem token -> 401
com token, sem permissão -> 403
com permissão de leitura -> GET 200
com permissão de escrita -> POST/PUT/PATCH/DELETE permitido
com permissão insuficiente -> 403
```

### Critérios de aceite

* `cadastro-api` tem testes por permissão.
* `identificacao-api` tem testes por permissão.
* `arrecadacao-api` tem testes por permissão.
* `distribuicao-api` tem testes por permissão.
* Testes não dependem de scope `access/write` como regra final.

---

## Tarefa 18 — Remover resíduos do modelo antigo

### Objetivo

Garantir que o modelo antigo não ficou parcialmente ativo.

### Ações

Pesquisar e remover usos de:

```text
RequireAuthorization("read")
RequireAuthorization("write")
RequireClaim("scope", "access")
RequireClaim("scope", "write")
hasRole('analista-cadastro')
hasRole('consultor')
scope=access
scope=write
```

### Critérios de aceite

* Nenhuma API usa `read/write` como autorização de negócio.
* Frontend não usa role para decidir exibição de ação de negócio.
* Documentação não orienta mais uso de `read/write` para autorização fina.

---

## Tarefa 19 — Criar ADRs

### Objetivo

Registrar decisões arquiteturais da migração.

### ADRs sugeridas

```text
docs/adr/adr-authn-logto-authz-ecad-authz.md
docs/adr/adr-permission-naming-convention.md
docs/adr/adr-backend-authoritative-authorization.md
docs/adr/adr-bff-permissions-for-ux.md
docs/adr/adr-dotnet-authz-sdk.md
```

### Critérios de aceite

* ADRs explicam contexto, decisão e consequências.
* ADRs deixam explícito que frontend não é fonte autoritativa.
* ADRs deixam explícito que Logto não é a fonte de autorização fina.

---

## Tarefa 20 — Checklist final de migração

### Objetivo

Validar que a migração foi concluída.

### Checklist

```text
[ ] Catálogo de permissões criado para Cadastro
[ ] Catálogo de permissões criado para Identificação
[ ] Catálogo de permissões criado para Arrecadação
[ ] Catálogo de permissões criado para Distribuição
[ ] Seeds criados no ecad-authz
[ ] SDK .NET criado
[ ] SDK .NET integrado no cadastro-api
[ ] SDK .NET integrado no identificacao-api
[ ] SDK .NET integrado no arrecadacao-api
[ ] SDK .NET integrado no distribuicao-api
[ ] Frontend chama BFF
[ ] BFF possui /api/me
[ ] BFF possui /api/me/permissions
[ ] React possui usePermissions
[ ] React possui componente Can
[ ] Nenhum endpoint usa RequireAuthorization("read")
[ ] Nenhum endpoint usa RequireAuthorization("write")
[ ] Nenhum componente usa hasRole como autorização de negócio
[ ] Testes de autorização passam nas 4 APIs
[ ] Ambiente local documentado e funcional
[ ] ADRs criadas
```

---

# 10. Ordem Recomendada de Implementação

```text
1. Atualizar documentação arquitetural
2. Criar catálogo de permissões das 4 APIs
3. Criar mapa de papéis e permissões
4. Criar seeds no ecad-authz
5. Criar SDK .NET base
6. Criar integração ASP.NET Core do SDK
7. Adicionar cache no SDK
8. Integrar SDK no cadastro-api
9. Integrar SDK no identificacao-api
10. Integrar SDK no arrecadacao-api
11. Integrar SDK no distribuicao-api
12. Criar endpoints /api/me e /api/me/permissions no BFF
13. Virar frontend para BFF
14. Criar usePermissions e Can no React
15. Remover resíduos read/write/hasRole
16. Criar testes nas 4 APIs
17. Atualizar ambiente local
18. Criar ADRs
19. Executar checklist final
```

---

# 11. Instruções para o Codex

## 11.1 Regra de execução

Execute as tarefas em ordem. Não avance para a próxima etapa se os critérios de aceite da etapa atual não estiverem satisfeitos.

## 11.2 Regra de segurança

Não substituir autenticação OIDC. A migração é de autorização, não de autenticação.

## 11.3 Regra de arquitetura

Não implementar autorização fina diretamente no frontend. O frontend pode consumir permissões para UX, mas a decisão real deve acontecer nas APIs via `ecad-authz`.

## 11.4 Regra de consistência

Toda permissão usada em código deve existir no catálogo versionado e no seed do `ecad-authz`.

## 11.5 Regra de nomenclatura

Toda permissão deve seguir:

```text
dominio:recurso:acao
```

## 11.6 Regra de remoção do legado

Ao final da migração, não devem existir usos de `read/write` como autorização de negócio.

## 11.7 Regra para as 4 APIs

A implementação deve cobrir obrigatoriamente:

```text
cadastro-api
identificacao-api
arrecadacao-api
distribuicao-api
```

Se alguma API ainda não possuir endpoints suficientes ou estiver incompleta, criar o catálogo inicial mesmo assim e marcar permissões como pendentes de validação contra endpoints reais.

---

# 12. Resultado Esperado

Ao final, o MCAD deverá ter:

* Logto atuando como provedor de autenticação OIDC/OAuth.
* BFF como fronteira do frontend.
* `ecad-authz` como fonte autoritativa de autorização fina.
* SDK .NET reutilizável pelas APIs .NET.
* SDK Java e React alinhados ao mesmo contrato.
* As 4 APIs protegidas por permissões explícitas.
* Frontend exibindo menus, rotas e botões com base em permissões efetivas.
* Nenhuma autorização de negócio baseada apenas em `read/write`.