# ADR 0004 — BFF Expõe `/api/me` e `/api/me/permissions` para UX

- **Status:** Accepted
- **Data:** 2026-05-14
- **Autores / decision-makers:** Equipe MCAD
- **Tags:** BFF, frontend, autorização, UX

---

## Context

Com o modelo de backend autoritativo (ADR 0003), o frontend ainda precisa de informações de permissão para conduzir a UX (esconder botões, ocultar menus, redirecionar rotas). Existem três caminhos possíveis para obter essas informações:

1. Frontend bate direto no ecad-authz.
2. Frontend bate direto nas APIs de domínio e infere permissões pelos 403s.
3. Frontend bate em um endpoint dedicado do BFF, que agrega os dados do ecad-authz.

A primeira opção exporia o ecad-authz ao tráfego público, criaria CORS adicional e duplicaria autenticação. A segunda é hostil ao usuário (descobrir permissões via tentativa e erro) e ruidosa em logs. A terceira é o padrão BFF clássico — agregação de contexto do usuário em um único ponto.

Adicionalmente, o ecad-authz expõe um header `X-Authz-Version` que permite cache eficiente: o cliente armazena permissões e só invalida quando a versão muda.

## Decision

- **BFF expõe dois endpoints** consumidos exclusivamente pelo frontend MCAD:
  - `GET /api/me` — devolve identidade do usuário (a partir do token Logto) acrescida de metadados (papéis, nome, e-mail).
  - `GET /api/me/permissions` — devolve a lista de permissões finas do usuário corrente, obtida do ecad-authz via `GET /v1/me/authorization-context`.
- **Cache no BFF:** TTL curto por sessão (≤ 60 s), invalidado quando o header `X-Authz-Version` retornado pelo ecad-authz mudar.
- **Frontend nunca fala direto com APIs internas nem com o ecad-authz.** Toda chamada passa pelo BFF, que aplica CORS, sessão e proxy.
- **Falha de leitura de permissões** (ex.: ecad-authz indisponível) retorna lista vazia para o front, garantindo "deny seguro" na UI. O backend sempre revalida ao receber a requisição real.
- **Testes do BFF** cobrem 401 (sem sessão), 200 (com permissões), e fallback degradado (ecad-authz fora).

## Consequences

### Positivas
- Frontend tem um único ponto de integração (`/api/*`), reduzindo CORS, configuração e duplicação de auth handlers.
- Cache de permissões fica próximo do consumidor, com invalidação dirigida por versão (não por tempo).
- BFF pode adicionar metadados úteis (`papéis`, `nome`, `e-mail`) sem precisar tocar no ecad-authz.
- Falhas no ecad-authz não derrubam a UI — apenas reduzem a UX a "estado deny" temporário.

### Negativas
- BFF se torna ponto crítico para a UX. Indisponibilidade do BFF significa frontend cego (mas o backend ainda autoriza corretamente).
- Estado da sessão precisa ser gerenciado no BFF (cookie + introspecção do token Logto).
- Pequena duplicação: BFF e APIs de domínio resolvem permissões de forma similar. Aceitável porque o BFF resolve para *UX* e as APIs para *decisão*.

## Alternatives Considered

1. **Frontend consome ecad-authz diretamente.**
   Rejeitada: expõe o ecad-authz publicamente, complica CORS, exige token de serviço no browser ou flow OAuth duplicado.

2. **Frontend infere permissões pelos 403** das chamadas reais.
   Rejeitada: UX degradada, telas piscando, logs ruidosos no backend, dificulta esconder menus antes do primeiro click.

3. **Embarcar permissões no token Logto** (custom claims).
   Rejeitada: tokens grandes, invalidação custosa (precisa re-emitir token a cada mudança), acopla autorização ao IdP (contra ADR 0001).

## References

- `services/bff/src/server.ts` — endpoints `/api/me` e `/api/me/permissions`
- `frontend/src/shared/authz/permissionsApi.ts`
- `frontend/src/shared/authz/PermissionsProvider.tsx`
- `ecad-authz/tasks/plataforma-ecad-authz/tasks/api-contract.yaml` — endpoint `GET /v1/me/authorization-context`
- ADR 0001 — Logto autentica, ecad-authz autoriza
- ADR 0003 — Backend autoritativo
