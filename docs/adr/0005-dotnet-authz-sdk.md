# ADR 0005 — SDK .NET Próprio para o ecad-authz

- **Status:** Accepted
- **Data:** 2026-05-14
- **Autores / decision-makers:** Equipe MCAD
- **Tags:** SDK, .NET, Java, autorização

---

## Context

Para consumir o ecad-authz a partir das APIs de domínio, era preciso um SDK em cada stack:

- **.NET** — usado por `cadastro-api`, `identificacao-api`, e futuramente `distribuicao-api`.
- **Java** — usado por `arrecadacao-api`.

Para .NET, considerou-se três caminhos:

1. Adotar uma lib externa (ex.: clients OPA, libs de OAuth com extensões de policy).
2. Gerar um client a partir do OpenAPI do ecad-authz com NSwag/Refit e envolvê-lo em uma camada custom.
3. Escrever um SDK próprio do zero, alinhado às convenções do monorepo (Minimal API, DI, cache via `IMemoryCache`).

Para Java, a plataforma `ecad-authz` já mantém um `authz-spring-boot-starter` oficial, com integração nativa ao Spring Security e modelo de anotações (`@RequiresPermission`).

## Decision

- **.NET — SDK próprio.** Manter dois projetos em `libs/dotnet/`:
  - `Ecad.Authz.Sdk` — cliente HTTP (`HttpEcadAuthzClient`), cache local (TTL configurável), modelo de permissão.
  - `Ecad.Authz.AspNetCore` — integração com `AuthorizationPolicyProvider`, `PermissionAuthorizationHandler`, extensões `AddEcadAuthz(...)` e `RequirePermission("...")` plugáveis no Minimal API.
- **Java — adotar o `authz-spring-boot-starter` do ecad-authz as is**, sem fork, mesmo com o trade-off de naming descrito no ADR 0002 (4 segmentos).
- **Critérios de evolução do SDK .NET:**
  - Versionamento via prefixo (`v1`), mesmo que a primeira versão seja embarcada no monorepo.
  - Testes de integração em pelo menos uma das APIs (`Cadastro.IntegrationTests`).
  - Pacote NuGet local (`PackageReference` por path) até que faça sentido publicar.

## Consequences

### Positivas
- SDK .NET alinhado ao estilo do monorepo (Minimal API, sem MediatR, com `IMemoryCache`), sem dependências surpresa.
- Cache e `X-Authz-Version` ficam encapsulados no SDK, então cada API consome via `RequirePermission("...")` sem precisar saber dos detalhes.
- Reaproveitamento direto do starter Java significa menos código autoral mantido — vantagem operacional.
- Possibilidade de evoluir o SDK .NET conforme o catálogo do ecad-authz crescer (ex.: escopo `ASSOCIATION` no futuro).

### Negativas
- Manutenção do SDK .NET é responsabilidade da equipe MCAD; quebras de contrato no ecad-authz exigem atualização manual.
- Heterogeneidade .NET vs Java: stack Java consome a versão "oficial" do starter, enquanto .NET tem um SDK autoral. Isso é parte do trade-off do ADR 0002 (formato 3 vs 4 segmentos).
- Risco de divergência semântica entre os dois SDKs (ex.: política de cache diferente). Mitigado por documentação e revisão cruzada.

## Alternatives Considered

1. **Usar NSwag/Refit para gerar client do OpenAPI** e envelopar como SDK.
   Rejeitada: a regeneração introduziria churn em PRs, e o ganho seria pequeno — o contrato é estável e o número de chamadas baixo (poucos endpoints).

2. **Adotar OPA (Open Policy Agent) com sidecar** em cada API e tirar o ecad-authz da equação.
   Rejeitada: operacionalmente mais caro, e duplica conceito de "fonte autoritativa" que já é provido pelo ecad-authz.

3. **Forkar o starter Java em uma versão MCAD** para alinhar a 3 segmentos.
   Rejeitada por enquanto: custo de manutenção do fork supera o desconforto da exceção (ver ADR 0002).

## References

- `libs/dotnet/Ecad.Authz.Sdk/HttpEcadAuthzClient.cs`
- `libs/dotnet/Ecad.Authz.AspNetCore/PermissionAuthorizationHandler.cs`
- `libs/dotnet/Ecad.Authz.AspNetCore/ServiceCollectionExtensions.cs`
- `ecad-authz/backend/sdk/authz-spring-boot-starter/`
- ADR 0001 — Logto autentica, ecad-authz autoriza
- ADR 0002 — Convenção de naming (3 vs 4 segmentos)
