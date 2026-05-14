# ADR 0002 — Convenção de Naming para Permissões (`dominio:area:recurso:acao`)

- **Status:** Accepted (final, 4 segmentos uniformes)
- **Data:** 2026-05-14 (revisão consolidada no mesmo dia)
- **Autores / decision-makers:** Equipe MCAD
- **Tags:** autorização, naming, contratos

---

## Histórico

Esta ADR teve uma primeira versão (2026-05-14) que aceitava **3 segmentos** como padrão e registrava o **4 segmentos** da `arrecadacao-api` como exceção. A heterogeneidade entre stacks gerou risco operacional (typos silenciosos, seeds bifurcados, dúvidas de onboarding em novos serviços). Esta revisão consolida a decisão final em **4 segmentos para todas as APIs**.

## Context

Com a separação entre autenticação e autorização (ver ADR 0001), foi necessário definir uma convenção uniforme de naming para permissões. O MCAD é multilíngue na superfície (português no domínio) e multi-stack no consumo (.NET, Java, TypeScript), então a convenção precisa ser:

- Legível por humanos e fácil de buscar (`grep`-friendly).
- Mecanicamente válida em diferentes runtimes (sem precisar de escaping).
- Composável em papéis e auditável.
- Coerente com o catálogo modelado em todas as APIs e com o starter Java do ecad-authz, que exige 4 segmentos.

A primeira versão aceitava 3 segmentos no .NET e 4 no Java. Em revisão, decidimos uniformizar em 4 segmentos para eliminar a fricção cognitiva e operacional.

## Decision

- **Padrão oficial do mcad: 4 segmentos** — `dominio:area:recurso:acao`, tudo em minúsculas, sem acento, sem espaços.
  - Exemplos: `cadastro:default:obra:criar`, `identificacao:default:captacao:listar`, `arrecadacao:default:cobranca:emitir`, `distribuicao:default:roteiro:processar` (futuro).
- **Segmento `area`:** representa subdivisão funcional dentro de um domínio. O valor `default` é usado quando o domínio não tem subdivisões. Permite no futuro segregar áreas como `cadastro:portal:obra:visualizar` vs `cadastro:admin:obra:visualizar` sem nova migração.
- **Regras invariantes:**
  - Sempre minúsculas, sem acento, sem espaços, sem `_`.
  - Separador: `:` (dois-pontos).
  - 4 segmentos sempre. Permissões com 3 segmentos são proibidas no código de produção.
  - Ação em verbo no infinitivo (`criar`, `listar`, `validar`, `emitir`, `estornar`, `reprocessar`).
  - Recurso no singular ou kebab-case (`obra`, `fonograma`, `cobranca`, `usuario-musica`).
  - Domínio coincide com o nome do bounded context (`cadastro`, `identificacao`, `arrecadacao`, `distribuicao`).
- **Todas as permissões devem estar no catálogo versionado** (`CadastroPermissions.cs`, `IdentificacaoPermissions.cs`, `permissions.yaml` no Java) **e** no seed do ecad-authz (`seeds/mcad/*.json`).
- **Não há exceção.** Qualquer permissão com 3 segmentos em código novo é tratada como bug.

## Consequences

### Positivas
- Convenção uniforme entre os 4 domínios e as 3 stacks (.NET, Java, TypeScript).
- O starter Java do ecad-authz funciona as is, sem fork.
- Eliminação de typos silenciosos (`arrecadacao:cliente:listar` deixa de ser ambíguo — sempre é `arrecadacao:default:cliente:listar`).
- Catálogos visualmente consistentes nos seeds e nos logs do ecad-authz.
- Novos serviços (independente da stack) herdam o formato automaticamente.
- O segmento `area` cria espaço para evoluir o modelo sem nova migração de naming.

### Negativas
- Permissões ficam ligeiramente mais longas (1 segmento extra `default`).
- Migração one-shot necessária para o código existente em cadastro/identificacao (.NET) e para o frontend que cita esses domínios.

## Alternatives Considered

1. **Manter 3 segmentos como padrão e tratar Java como exceção** (versão anterior desta ADR).
   Rejeitada: a heterogeneidade gerava risco de typo silencioso (403 invisível em produção), seeds bifurcados, e qualquer novo serviço Java amplificava o problema. A "Open Question" virava débito permanente.

2. **Forkar o starter Java** para aceitar 3 segmentos.
   Rejeitada: custo de manutenção do fork supera o custo do segmento extra. Manteria dependência divergente do upstream do ecad-authz.

3. **Adotar 5 segmentos** (`mcad:dominio:area:recurso:acao`).
   Rejeitada: o segmento `mcad` é redundante — o catálogo do ecad-authz já é namespaced por serviço no `permission-catalog/register`.

4. **Usar nomes "humanos" agrupados por papel** (ex.: `analista-cadastro.pode-criar-obra`).
   Rejeitada: confunde permissão com papel, dificulta composição e quebra a separação conceitual descrita no ADR 0001.

## Migration Notes

Esta decisão exigiu migração one-shot dos seguintes artefatos (executada em 2026-05-14):

- `services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroPermissions.cs` — 41 constantes renomeadas para `cadastro:default:<recurso>:<acao>`.
- `services/identificacao-api/1-Services/Identificacao.API/Authorization/IdentificacaoPermissions.cs` — 20 constantes renomeadas para `identificacao:default:<recurso>:<acao>`.
- `seeds/mcad/cadastro.permissions.json` e `seeds/mcad/identificacao.permissions.json` — chaves atualizadas.
- `seeds/mcad/roles.json` — todas as referências `cadastro:*` e `identificacao:*` ajustadas para 4 segmentos.
- Frontend: literais `can('cadastro:...')`, `permission="cadastro:..."`, `anyOf=['cadastro:...']` etc. em `features/cadastro/`, `features/identificacao/`, `app/router/routes.tsx`, `shared/components/layout/sidebar/Sidebar.tsx`.
- Testes de autorização nas duas APIs .NET ajustados.

## References

- `services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroPermissions.cs`
- `services/identificacao-api/1-Services/Identificacao.API/Authorization/IdentificacaoPermissions.cs`
- `services/arrecadacao-api/arrecadacao-api/src/main/resources/permissions.yaml`
- `seeds/mcad/*.json`
- ADR 0001 — Logto autentica, ecad-authz autoriza
- ADR 0005 — SDK .NET próprio
