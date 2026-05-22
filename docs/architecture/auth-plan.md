# Autenticação e Autorização — MCAD

> **Tipo:** documentação arquitetural cross-cutting
> **Status:** implementado nas APIs ativas, com pendências mapeadas
> **Atualizado em:** 2026-05-20
> **Decisões base:** ADR 0001, ADR 0002, ADR 0003, ADR 0004 e ADR 0005

---

## 1. Decisão atual

O MCAD separa autenticação e autorização:

- **Autenticação:** feita por um IdP OIDC/OAuth2. Em produção, o IdP é o Logto; Keycloak permanece compatível para ambientes locais/históricos.
- **Autorização fina:** feita pelo `ecad-authz`, que mantém catálogo de permissões, papéis, atribuições, contexto de autorização, decisão `permit/deny` e revogação de sessão.
- **Frontend:** usa permissões efetivas apenas para UX. A decisão autoritativa sempre acontece no backend.
- **APIs:** validam JWT Bearer e chamam `ecad-authz` via SDK antes de executar operações protegidas.

O modelo antigo de autorização por scopes genéricos `read`/`write` e por `hasRole(...)` não é o padrão de produção. Papéis do IdP servem, no máximo, como informação auxiliar de identidade; papéis de negócio ficam no `ecad-authz`.

## 2. Componentes

```text
Usuario
  |
  | Authorization Code + PKCE
  v
Frontend React  <------>  IdP OIDC (Logto em prod; Keycloak local)
  |
  | Authorization: Bearer <access_token>
  +---------------------> APIs de dominio
  |                         | 1. validam JWT
  |                         | 2. exigem permissao fina
  |                         v
  |                       ecad-authz /v1/authz/decisions
  |
  | GET /api/me/permissions
  v
BFF --------------------> ecad-authz /v1/me/authorization-context
```

### IdP OIDC

Responsabilidades:

- autenticar o usuário;
- emitir access tokens JWT com `sub`, `email`, `name`, `sid` quando disponível e claims OIDC básicas;
- expor discovery e JWKS para validação dos resource servers;
- manter sessão e fluxo de logout.

Não é responsabilidade do IdP:

- guardar a matriz de permissões de negócio;
- decidir se um usuário pode executar uma ação específica de Cadastro, Identificação, Arrecadação ou Distribuição.

### ecad-authz

Responsabilidades:

- registrar permissões técnicas por catálogo;
- compor papéis como `cadastro.default.consultor` e `cadastro.default.analista`;
- atribuir papéis a usuários provisionados;
- responder contexto de autorização (`/v1/me/authorization-context`);
- responder decisões finas (`/v1/authz/decisions`);
- aplicar revogação de sessão quando há `sid` no token;
- expor versionamento via `X-Authz-Version` e cache.

## 3. Fluxo de autenticação no frontend

O frontend usa `oidc-client-ts` em `frontend/src/shared/auth/`.

Fluxo:

1. Usuário acessa rota protegida.
2. `AuthProvider` inicia login OIDC com Authorization Code + PKCE.
3. O IdP redireciona para `/callback`.
4. `CallbackPage` processa o retorno e restaura a rota original.
5. `AuthProvider` mantém o token em `InMemoryWebStorage` e registra providers de token nos clients HTTP.
6. Em `401`, `authenticatedFetch` tenta renovar silenciosamente; se falhar, inicia novo login.
7. Logout redireciona ao IdP e retorna para `/logout`.

Configuração principal:

```env
OIDC_AUTHORITY=https://9lcinu.logto.app/oidc
OIDC_CLIENT_ID=mcad-frontend
OIDC_AUDIENCE=https://api.mcad.local
OIDC_REDIRECT_URI=http://localhost:5173/callback
OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:5173/logout
```

Notas específicas do Logto:

- tokens de API usam RFC 9068 e podem vir com `typ=at+jwt`;
- o parâmetro `resource` precisa ir na autorização e na troca de código para emitir JWT com audience da API;
- o frontend pede `scope: openid profile roles access write`, mas autorização fina não deve depender de `access`/`write`.

## 4. Autorização no frontend

O frontend consulta permissões efetivas pelo BFF:

- `GET /api/me`
- `GET /api/me/permissions`

Arquivos principais:

- `frontend/src/shared/authz/PermissionsProvider.tsx`
- `frontend/src/shared/authz/usePermissions.ts`
- `frontend/src/shared/authz/Can.tsx`
- `frontend/src/shared/auth/RequirePermission.tsx`
- `frontend/src/shared/authz/permissionsApi.ts`

Regras:

- `Can`, `usePermissions().can(...)`, `hasAny(...)` e `hasAll(...)` são helpers de UX.
- Rotas e botões podem ser escondidos quando a permissão falta.
- Nenhum controle visual substitui a autorização no backend.
- `hasRole` não deve ser usado para autorização de negócio nova.

## 5. BFF e contexto de autorização

O BFF recebe o Bearer token do frontend e consulta:

```text
GET {AUTHZ_BASE_URL}/v1/me/authorization-context
```

Depois expõe ao frontend uma resposta menor:

```json
{
  "subjectId": "sub-do-usuario",
  "permissions": ["cadastro:default:obra:listar"],
  "version": 42
}
```

Comportamento:

- sem Bearer token: `401 UNAUTHORIZED`;
- token inválido, expirado ou sessão revogada pelo upstream: `401`;
- indisponibilidade, timeout ou resposta malformada do `ecad-authz`: `503 AUTHZ_UNAVAILABLE`;
- cache curto por `sub`, usando o `version` do contexto.

Variáveis:

```env
AUTHZ_BASE_URL=http://localhost:8085
AUTHZ_TIMEOUT_MS=3000
AUTHZ_TIMEOUT_SECONDS=3
AUTHZ_CACHE_TTL_SECONDS=60
```

## 6. APIs .NET

APIs .NET ativas usam:

- `Microsoft.AspNetCore.Authentication.JwtBearer` para validar JWT via issuer/JWKS;
- `Ecad.Authz.AspNetCore` e `Ecad.Authz.Sdk` para autorização fina;
- helpers por domínio, como `RequireCadastroPermission(...)` e `RequireIdentificacaoPermission(...)`.

Exemplo:

```csharp
group.MapPost("/", CriarObra)
    .RequireCadastroPermission(CadastroPermissions.ObraCriar, authEnabled);
```

Variáveis principais:

```env
AUTH_ENABLED=true
OIDC_AUTHORITY=https://9lcinu.logto.app/oidc
OIDC_AUDIENCE=https://api.mcad.local
AUTHZ_BASE_URL=http://localhost:8085
AUTHZ_TIMEOUT_SECONDS=3
AUTHZ_CACHE_TTL_SECONDS=60
AUTHZ_SERVICE_TOKEN_CADASTRO=<service-token-cadastro>
AUTHZ_SERVICE_TOKEN_IDENTIFICACAO=<service-token-identificacao>
```

Quando `AUTH_ENABLED=false`, os helpers liberam acesso anônimo para desenvolvimento local. Esse modo não deve ser usado em produção.

## 7. APIs Java/Spring

APIs Java usam:

- Spring Security resource server para validação JWT;
- `authz-spring-boot-starter` para autorização fina;
- `@RequiresPermission(...)` em controllers ou serviços;
- `permissions.yaml` como catálogo versionado.

Exemplo:

```java
@RequiresPermission("arrecadacao:default:pagamento:estornar")
public ResponseEntity<?> estornar(...) {
    ...
}
```

Configuração:

```yaml
app:
  security:
    auth-enabled: ${AUTH_ENABLED:true}

ecad:
  authz:
    enabled: ${AUTHZ_ENABLED:true}
    base-url: ${AUTHZ_BASE_URL:http://localhost:8085}
    catalog:
      registration-required: ${AUTHZ_CATALOG_REGISTRATION_REQUIRED:true}
      service-name: ${AUTHZ_SERVICE_NAME:arrecadacao}
      file: classpath:permissions.yaml
```

Os serviços Java aceitam tokens `typ=JWT` e `typ=at+jwt` quando configurados para Logto.

## 8. Convenção de permissões

Permissões novas usam sempre 4 segmentos:

```text
{dominio}:{area}:{recurso}:{acao}
```

Regras:

- minúsculas, sem acento, sem espaços;
- `area=default` quando não há subdivisão funcional;
- recurso no singular ou kebab-case;
- ação em verbo no infinitivo;
- toda permissão usada em código deve existir no catálogo e no seed do `ecad-authz`.

Exemplos:

```text
cadastro:default:obra:criar
identificacao:default:captacao:fechar
arrecadacao:default:pagamento:estornar
distribuicao:default:processo:calcular
```

Catálogos atuais no workspace:

| Domínio | Fonte canônica | Quantidade |
|---|---|---:|
| Cadastro | `CadastroPermissions.cs` + `seeds/mcad/cadastro.permissions.json` | 41 |
| Identificação | `IdentificacaoPermissions.cs` + `seeds/mcad/identificacao.permissions.json` | 20 |
| Arrecadação | `permissions.yaml` + `seeds/mcad/arrecadacao.permissions.json` | 17 |
| Distribuição | `permissions.yaml` + `seeds/mcad/distribuicao.permissions.json` | 9 |

O relatório de produção de 2026-05-15 validou 78 permissões sem Distribuição. O catálogo de Distribuição está presente no workspace e deve ser validado/aplicado quando o serviço for promovido no ambiente alvo.

## 9. Papéis e atribuições

Papéis padrão seguem:

```text
{dominio}.default.consultor
{dominio}.default.analista
```

Regra geral:

- `*.default.consultor`: permissões de leitura, consulta e visualização;
- `*.default.analista`: conjunto do consultor mais escrita, processamento e transições de estado.

Seeds:

- `seeds/mcad/*.permissions.json`
- `seeds/mcad/roles.json`
- `seeds/mcad/assignments.json`
- `scripts/seed-authz.sh`

O seed é idempotente e deve ser executado antes de subir uma API que exija permissões novas, para evitar `403` por catálogo/papel ainda não disponível.

## 10. Semântica de erro

| Situação | Código esperado |
|---|---:|
| Sem token ou token inválido | 401 |
| Sessão revogada | 401 |
| Token válido sem permissão | 403 |
| Permissão existe e usuário está autorizado | 2xx ou erro de negócio/payload |
| `ecad-authz` indisponível e sem cache válido | 503 |
| `AUTH_ENABLED=false` em dev | endpoints liberados conforme configuração local |

Em testes de autorização, um `400` de validação de payload depois da checagem de permissão pode ser aceitável para provar que a autorização passou. Um `403` nesse caso indica falha de permissão.

## 11. Checklist para novas features

Antes de mergear uma feature protegida:

```text
[ ] Permissão criada no catálogo do domínio
[ ] Permissão adicionada ao seed do ecad-authz
[ ] Papel consultor/analista atualizado quando aplicável
[ ] Backend exige a permissão no endpoint/serviço
[ ] Frontend usa Can/usePermissions/RequirePermission apenas para UX
[ ] Teste cobre 401 sem token
[ ] Teste cobre 403 sem permissão
[ ] Teste cobre sucesso com permissão
[ ] Documentação do catálogo foi atualizada
```

## 12. Referências

- `docs/adr/0001-authn-logto-authz-ecad-authz.md`
- `docs/adr/0002-permission-naming-convention.md`
- `docs/adr/0003-backend-authoritative-authorization.md`
- `docs/adr/0004-bff-permissions-for-ux.md`
- `docs/adr/0005-dotnet-authz-sdk.md`
- `docs/migracao-authz/guia-operacional.md`
- `docs/migracao-authz/relatorio-final.md`
- `docs/authz/catalog/`
- `ecad-authz/docs/architecture-overview.md`
