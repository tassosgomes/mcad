# Architecture Decision Records — MCAD

Este diretório reúne os ADRs (Architecture Decision Records) do MCAD. Os ADRs documentam decisões arquiteturais relevantes — contexto, decisão tomada, consequências e alternativas consideradas — para que a equipe (atual e futura) consiga reconstruir o "porquê" de escolhas estruturais.

Convenções:

- Cada ADR usa numeração sequencial de 4 dígitos (`0001`, `0002`, ...).
- O nome do arquivo segue `NNNN-titulo-em-kebab-case.md`.
- Status possíveis: `Proposed`, `Accepted`, `Deprecated`, `Superseded by NNNN`.
- ADRs aceitos são imutáveis na essência — mudanças significativas devem ser registradas em um novo ADR que substitui o anterior.

## Índice

| Nº | Título | Status | Data |
|---|---|---|---|
| [0001](./0001-authn-logto-authz-ecad-authz.md) | Separação entre Autenticação (Logto) e Autorização Fina (ecad-authz) | Accepted | 2026-05-14 |
| [0002](./0002-permission-naming-convention.md) | Convenção de Naming para Permissões (`dominio:area:recurso:acao`) | Accepted (final, 4 segmentos uniformes) | 2026-05-14 |
| [0003](./0003-backend-authoritative-authorization.md) | Backend como Fonte Autoritativa de Autorização | Accepted | 2026-05-14 |
| [0004](./0004-bff-permissions-for-ux.md) | BFF Expõe `/api/me` e `/api/me/permissions` para UX | Accepted | 2026-05-14 |
| [0005](./0005-dotnet-authz-sdk.md) | SDK .NET Próprio para o ecad-authz | Accepted | 2026-05-14 |
| [0006](./0006-perfis-built-in-rbac.md) | Catálogo Canônico de Perfis Built-in (Framework RBAC) | Accepted | 2026-05-26 |
| [0007](./0007-dominio-acessos-segregado.md) | Domínio Transversal `acessos` Segregado do Super-Admin de Plataforma | Accepted | 2026-05-26 |
| [0008](./0008-bff-gateway-cross-cutting.md) | BFF como Gateway de Operações Cross-cutting | Accepted | 2026-05-26 |
| [0009](./0009-cpf-masking-permission-aware-mapper.md) | Mascaramento Server-Side de CPF via Permission-Aware Mapper | Accepted | 2026-05-26 |
| [0010](./0010-ci-cd-pipeline-strategy.md) | Estratégia de Pipeline CI/CD (Shadow Pipeline + Gates de Segurança + CD via Portainer) | Accepted | 2026-06-17 |

## Decisões abertas / futuras ADRs

- **Escopo `ASSOCIATION`** — autorização condicionada a associação do usuário (ex.: analista vê só obras da sua associação). Mudará a assinatura das permissões e a chamada ao ecad-authz.
- **Admin UI via BFF** — avaliar substituir chamadas diretas do frontend ao `ecad-authz` por rotas `/api/authz/*` no BFF, além das rotas cross-cutting definidas no ADR 0008.
- **Rollout dos demais domínios** — aplicar o framework do ADR 0006 a Cadastro, Identificação e Arrecadação em PRDs próprios.

## Como propor uma nova ADR

1. Copie o template implícito de qualquer ADR existente (estrutura: Status, Data, Context, Decision, Consequences, Alternatives Considered, References).
2. Numere sequencialmente.
3. Abra em status `Proposed`; mude para `Accepted` após revisão pela equipe.
4. Atualize o índice acima.
