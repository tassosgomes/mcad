# ADR 0007 — Domínio Transversal `acessos` Segregado do Super-Admin de Plataforma

- **Status:** Accepted
- **Data:** 2026-05-26
- **Autores / decision-makers:** Equipe MCAD
- **Tags:** autorização, governança, segregação de funções

---

## Context

Atualmente, atribuir e remover papéis de usuários no `ecad-authz` exige permissão `authz:admin:*` — o super-admin de plataforma de autorização. Esse perfil agrupa em uma única identidade:

- **Administração técnica:** criar/editar permissões no catálogo, depreciar permissões, gerenciar o próprio `ecad-authz` (operações de plataforma).
- **Governança de pessoas:** atribuir e remover papéis a usuários (operações de RH/governança de acesso).

A mistura tem três problemas:

1. **Falta de segregação de funções.** O time que opera a plataforma `ecad-authz` em produção (SREs, devs de plataforma) não deve necessariamente ser quem decide que usuário recebe que papel — essa é uma decisão de negócio/governança.
2. **Auditoria fraca.** Não há como, em auditoria externa, demonstrar que assignments seguem um workflow controlado, pois eles compartilham o mesmo papel super-admin com operações técnicas.
3. **Onboarding pesado.** Para o ECAD nomear um Gestor de Acessos hoje, é preciso dar super-admin — um sino enorme para uma função pequena.

## Decision

Criar um **novo domínio transversal `acessos`** no catálogo do `ecad-authz` que abriga permissões dedicadas a gestão de papéis de usuários e sua auditoria. O domínio expõe dois perfis built-in:

### `acessos.default.gestor` (Gestor de Acessos)

Único perfil **recomendado e auditado** para atribuição/remoção de papéis no mcad. Possui 7 permissões:

| Permissão | Categoria |
|---|---|
| `acessos:default:papel:listar` | Leitura |
| `acessos:default:papel:visualizar` | Leitura |
| `acessos:default:usuario:listar` | Leitura |
| `acessos:default:usuario:visualizar-papeis-completo` | Leitura |
| `acessos:default:papel:atribuir` | Operação reversível |
| `acessos:default:papel:remover` | Operação reversível |
| `acessos:default:atribuicao:ver-historico` | Trilha de auditoria |

### `acessos.default.consultor` (Consultor de Acessos)

Perfil read-only para Compliance Officer ou auditor externo. 5 permissões (mesmo conjunto do Gestor menos `papel:atribuir` e `papel:remover`).

### Permissões escopadas por domínio (consumidas pelo Gerente)

Para suportar a visão escopada do Gerente (ADR 0006):

| Permissão | Quem recebe |
|---|---|
| `acessos:{dominio}:papel:visualizar` | Perfil Gerente do domínio `{dominio}` |
| `acessos:{dominio}:atribuicao:ver-historico` | Perfil Gerente do domínio `{dominio}` |

Onde `{dominio}` ∈ `{cadastro, identificacao, arrecadacao, distribuicao}`.

### Relação com `authz:admin:*` (super-admin de plataforma)

- O super-admin de plataforma **mantém** capacidade técnica de atribuir papéis — é caminho de break-glass e administração emergencial.
- O caminho **recomendado, documentado e auditado** para operações de assignment do dia a dia é via Gestor de Acessos.
- Métrica de sucesso: ≥ 80% das atribuições passam pelo Gestor de Acessos (vs. super-admin) após a Fase 2 da entrega.

## Alternativas Consideradas

### Alternativa 1: Subdividir `authz:admin:*` em sub-permissões

- **Descrição:** Quebrar o super-admin atual em permissões menores (`authz:admin:user:assign-role`, `authz:admin:catalog:edit`, etc.).
- **Prós:** reusa namespace existente; sem novo domínio.
- **Contras:** namespace `authz:*` permanece misturando governança de pessoas com administração técnica. Atribuições continuam tendo "cara" de operação de plataforma, não de governança de acesso.
- **Por que rejeitada:** não resolve o problema semântico de segregação.

### Alternativa 2: Manter como está e fortalecer documentação

- **Descrição:** Continuar com super-admin único; documentar que apenas pessoas autorizadas recebem.
- **Prós:** zero mudança técnica.
- **Contras:** auditoria fraca; sem método mecânico de separar funções.
- **Por que rejeitada:** PRD exige criação do perfil dedicado.

### Alternativa 3: Perfil "Gestor de Acessos" dentro de um domínio existente

- **Descrição:** Colocar o perfil em algum dos 4 domínios de negócio (ex.: `plataforma.default.gestor-acessos`).
- **Prós:** evita criar novo domínio.
- **Contras:** "plataforma" não é um domínio de negócio definido no Vision Doc; "gestao" forçar dentro de outro domínio gera confusão semântica.
- **Por que rejeitada:** o conceito é genuinamente transversal; merece domínio próprio.

## Consequências

### Positivas

- Segregação clara entre administração técnica (`authz:admin:*`) e governança de acessos (`acessos.default.gestor`).
- Compliance Officer ganha perfil dedicado (`acessos.default.consultor`) sem nenhum poder de escrita.
- Catálogo do mcad ganha um exemplo de domínio transversal (não de negócio), padrão útil para futuras necessidades de IAM.
- Auditoria externa pode demonstrar mecanicamente: "todas as atribuições do dia a dia passaram pelo Gestor de Acessos".

### Negativas

- Mais um domínio no catálogo (de 4 para 5).
- Sidebar do frontend precisa exibir o módulo de Autorização para mais perfis (super-admin, Gestor de Acessos, Gerentes — ver ADR 0008).
- A permissão `acessos:{dominio}:papel:visualizar` é escopada por nome do domínio, o que cria acoplamento entre nome de domínio de negócio e o catálogo de acessos. Se um domínio for renomeado no futuro, é preciso re-seed.

### Riscos

- **Risco de subutilização:** time pode continuar atribuindo via super-admin "porque já está acostumado". **Mitigação:** warning visual na admin UI antiga; métrica de razão Gestor/super-admin; recomendação no runbook.
- **Risco de scope creep do Gestor de Acessos:** alguém pode pedir para o Gestor também editar catálogo de permissões. **Mitigação:** ADR documenta o escopo limitado; novas permissões para o Gestor exigem PR + ADR.

## Notas de Implementação

- Catálogo `seeds/mcad/acessos.permissions.json` (novo) registra as permissões.
- `seeds/mcad/roles.json` ganha entradas `acessos.default.gestor` e `acessos.default.consultor`.
- Script `seed-authz.sh` já é idempotente; chamada incremental funciona.
- O perfil `Gerente` de cada domínio inclui automaticamente `acessos:{dominio}:papel:visualizar` e `acessos:{dominio}:atribuicao:ver-historico` no seu `permissionKeys`.

## Referências

- PRD: `tasks/plataforma/prd-perfis-builtin-rbac/prd.md`
- ADR 0001 — Autenticação Logto + Autorização `ecad-authz`
- ADR 0002 — Convenção de naming
- ADR 0006 — Catálogo canônico de perfis built-in
- ADR 0008 — BFF como gateway cross-cutting
