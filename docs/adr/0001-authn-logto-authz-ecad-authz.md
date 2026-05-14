# ADR 0001 — Separação entre Autenticação (Logto) e Autorização Fina (ecad-authz)

- **Status:** Accepted
- **Data:** 2026-05-14
- **Autores / decision-makers:** Equipe MCAD
- **Tags:** autenticação, autorização, OIDC, ecad-authz

---

## Context

Antes da migração, o MCAD utilizava o Logto (e historicamente o Keycloak em ambiente local) tanto para autenticação quanto como fonte indireta de autorização, via scopes genéricos (`scope=access`, `scope=write`) e papéis macro (`analista-cadastro`, `consultor`). Esse modelo apresentava três problemas estruturais:

1. **Granularidade insuficiente.** Não havia como distinguir, por exemplo, "consultar obra" de "validar fonograma". Tudo caía em `read`/`write`.
2. **Acoplamento ao IdP.** A semântica de negócio (quem pode emitir cobrança, quem pode validar identificação) ficava espalhada entre regras do Logto e código das APIs.
3. **Difícil auditoria.** Decisões de autorização não geravam trilha estruturada, e mudanças exigiam alterações tanto no IdP quanto no código.

Em paralelo, a plataforma `ecad-authz` foi desenvolvida como serviço dedicado à autorização fina, com modelo `dominio:recurso:acao`, papéis composáveis, cache e versionamento (`X-Authz-Version`).

## Decision

- **Autenticação permanece no Logto.** O Logto continua emitindo tokens OIDC/OAuth, gerenciando sessão e identidade do usuário.
- **Autorização fina migra para o ecad-authz.** Toda decisão `permit/deny` baseada em negócio passa pelo ecad-authz, consultado pelas APIs de domínio via SDK (`Ecad.Authz.Sdk` em .NET, `authz-spring-boot-starter` em Java).
- **Scopes genéricos `read`/`write` são removidos.** Substituídos por permissões explícitas no formato `dominio:recurso:acao` (ver ADR 0002).
- **Papéis no ecad-authz, não no IdP.** A composição de permissões em papéis (`cadastro.consultor`, `cadastro.analista`, etc.) é gerenciada exclusivamente no ecad-authz.
- **Token do Logto carrega apenas identidade.** O `sub`, `email` e claims básicas — nada de permissão fina.

## Consequences

### Positivas
- Decisão de autorização concentrada em um único serviço, com modelo coerente entre as 4 APIs.
- Mudança de papel ou permissão não requer redeploy das APIs.
- Auditoria centralizada (logs de `permit/deny` no ecad-authz).
- Cache local nos SDKs reduz latência sem perder consistência (via `X-Authz-Version`).

### Negativas
- Dependência operacional do ecad-authz: se ele cair, as APIs perdem capacidade de autorizar. Mitigação via cache curto e fallback de "deny seguro".
- Latência adicional na primeira consulta de cada par (sujeito, permissão). Mitigada pelo cache.
- Necessidade de manter SDK cliente em cada stack (.NET e Java) sincronizado com o contrato OpenAPI do ecad-authz.
- Sessão e revogação ficam parcialmente acopladas: revogação imediata exige `sid` no JWT do Logto e propagação ao ecad-authz.

## Alternatives Considered

1. **Manter autorização inteiramente no Logto** (via scopes/roles + custom claims).
   Rejeitada: o Logto não oferece modelo de permissão fina composável; alimentar dezenas de scopes via custom claims geraria tokens grandes e degradaria a experiência do administrador.

2. **Embarcar o motor de autorização em cada API** (lib local com regras hardcoded ou OPA embarcado).
   Rejeitada: replicaria o catálogo de permissões em 4 serviços e dificultaria mudanças coordenadas; OPA isolado em cada API ainda traria custo de operar e versionar bundles separados.

3. **Usar Keycloak Authorization Services** como motor central.
   Rejeitada: o monorepo já decidiu pelo Logto como IdP de produção; reintroduzir Keycloak apenas para autorização adicionaria dependência operacional sem ganho material sobre a plataforma ecad-authz já existente.

## References

- `docs/migracao-authz/prd.md` — PRD da migração (T1, T2)
- `ecad-authz/docs/architecture-overview.md`
- ADR 0002 — Convenção de naming de permissões
- ADR 0003 — Backend como fonte autoritativa
