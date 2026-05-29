# ADR 0006 — Catálogo Canônico de Perfis Built-in (Framework RBAC)

- **Status:** Accepted
- **Data:** 2026-05-26
- **Autores / decision-makers:** Equipe MCAD
- **Tags:** autorização, RBAC, governança, framework

---

## Context

Após a migração para `ecad-authz` (ADR 0001) e a consolidação do naming em 4 segmentos (ADR 0002), o mcad operou por algum tempo com 8 perfis built-in (`{dominio}.default.{consultor,analista}` × 4 domínios). A divisão binária leitura × escrita atendeu a primeira onda da migração, mas se mostrou insuficiente para o modelo de governança que o ECAD precisa exercer sobre:

- Operações irreversíveis em fluxos financeiros (finalização de processo de distribuição, estornos de pagamento, exclusões).
- Visualização de trilhas de auditoria (quem fez o quê, quando) — atualmente disponível apenas a super-admins de plataforma.
- Componentes de UI que precisam de gating além da rota (mascaramento de PII, exportações, botões de ação destrutiva).

O `ecad-authz` suporta nativamente permissões 4-segmentos arbitrárias e decisão em tempo real via `AuthzDecisionClient`, então a limitação não é técnica — é de modelagem de catálogo.

## Decision

Adotar como framework canônico de RBAC do mcad uma estrutura de **quatro níveis por domínio de negócio**, com **Gerente e Analista em eixos distintos e segregados** (não estritamente hierárquicos), combinada com uma **taxonomia de cinco categorias de permissão**:

### Quatro níveis por domínio de negócio

| Perfil | Eixo | Semântica |
|---|---|---|
| Consultor | Leitura | Listar, visualizar, abrir telas read-only |
| Operador | Operação | Criar, editar, recalcular idempotente; nunca decide status nem audita |
| Gerente | Governança / Auditoria | Decisões de status (incluindo irreversíveis inerentes ao fluxo) + visualização exclusiva da trilha de auditoria do domínio + visão escopada de assignments daquele domínio |
| Analista | Operação sênior | Conjunto amplo da operação, inclusive ações ultra-sensíveis e excepcionais; **não vê** trilha de auditoria nem assignments |

**Importante:** Gerente NÃO é subconjunto de Analista, e Analista NÃO é subconjunto de Gerente. Essa segregação é deliberada e expressa a separação clássica entre quem opera (Operador / Analista) e quem governa/audita (Gerente).

### Cinco categorias de permissão

| Categoria | Definição |
|---|---|
| Leitura | Consulta de dados. Não muda estado. |
| Operação reversível | Cria/edita ou dispara ações idempotentes; pode ser refeita sem perda. |
| Decisão de status | Move o objeto na máquina de estados. Algumas decisões são irreversíveis. |
| Ação sensível / componente UI | Granularidade fina dentro de tela ou dado (mascaramento de PII, exportações, força bruta). Não corresponde a rota HTTP única. |
| Trilha de auditoria | Acesso ao histórico de alterações e logs de governança. **Exclusiva do Gerente.** |

### Convenção de naming

- Domínios de negócio: `{dominio}.default.{consultor|operador|gerente|analista}`
- Domínio transversal de acessos: separado em ADR 0007.
- `displayName` em português `"{Nível} {Domínio}"` (ex.: `Gerente Distribuição`).
- `description` inicia com `[Built-in]`.
- Permissões mantêm o padrão 4-segmentos da ADR 0002.
- `description` da permissão inicia com a categoria entre colchetes (ex.: `[Decisão de status] Aprova o cálculo`).

### Ciclo de vida

- Perfis built-in são versionados via `seeds/mcad/roles.json`.
- Alterações de catálogo passam por PR + re-seed (`scripts/seed-authz.sh`).
- Assignments a usuários são feitos exclusivamente pelo Gestor de Acessos (ver ADR 0007), não direto via super-admin de plataforma.

## Alternativas Consideradas

### Alternativa 1: Aprovador em vez de Gerente

- **Descrição:** Nomear o perfil de governança como "Aprovador".
- **Prós:** termo comum em literatura RBAC.
- **Contras:** "Aprovador" comunica apenas a função de aprovação; o escopo aqui inclui auditoria e visão de assignments, que excede aprovação.
- **Por que rejeitada:** "Gerente" comunica governança + responsabilidade pelo domínio.

### Alternativa 2: Analista como superset literal (inclui auditoria)

- **Descrição:** Manter Analista como "tudo do domínio", incluindo trilha de auditoria.
- **Prós:** simples de explicar ("Analista vê tudo"); preserva intuição da estrutura anterior.
- **Contras:** elimina segregação de funções — quem opera tem como auditar a si mesmo.
- **Por que rejeitada:** contraria o princípio de SoD que motivou parte da refatoração.

### Alternativa 3: Aditivo big-bang nos 4 domínios

- **Descrição:** Adicionar Operador e Gerente nos 4 domínios simultaneamente, sem granularidade UI.
- **Prós:** rápido para alcançar consistência de catálogo.
- **Contras:** perde a oportunidade de explorar granularidade fina (UI + trilha de auditoria).
- **Por que rejeitada:** o objetivo é justamente explorar essa granularidade, domínio por domínio.

### Alternativa 4: Renomear Analista → Senior

- **Descrição:** Renomear `*.default.analista` para `*.default.senior` e adicionar Operador + Gerente.
- **Prós:** comunica melhor a semântica de "nível mais amplo".
- **Contras:** exige migração de usuários reais, atualização de hardcodes, disrupção operacional.
- **Por que rejeitada:** ganho semântico não justifica o custo; semântica pode ser melhorada via `description` sem renaming.

### Alternativa 5: Dual-control (aprovação por dois perfis)

- **Descrição:** Algumas ações exigem dois usuários distintos clicando em sequência.
- **Prós:** governança mais robusta.
- **Contras:** muda backend de domínios (modelo de approval), contratos de evento, UI.
- **Por que rejeitada:** complexidade desproporcional. Fica como evolução futura compatível com este framework.

## Consequências

### Positivas

- Segregação real de funções entre operação (Operador/Analista) e governança (Gerente).
- Trilha de auditoria deixa de ser privilégio de super-admin.
- Catálogo passa a ter exemplos concretos de permissões de UI (mascaramento, exportação, força bruta) que demonstram a granularidade que o `ecad-authz` permite.
- Framework replicável por domínio — próximos PRDs (Cadastro, Identificação, Arrecadação) reutilizam a estrutura sem reabrir as decisões.

### Negativas

- Catálogo cresce de 8 para 16 perfis built-in (ao longo do roadmap), exigindo mais disciplina de manutenção.
- Usuários com `*.default.analista` deixam de ter "tudo" — perdem a expectativa implícita de auditoria. Mitigação: comunicado de release; quem precisa de auditoria recebe também `*.default.gerente`.
- Granularidade UI exige mudanças coordenadas entre catálogo, frontend e (em alguns casos) backend.

### Riscos

- **Risco de adoção:** governança ECAD pode não nomear Gerentes, deixando trilha de auditoria inutilizada. **Mitigação:** runbook do ADR recomenda explicitamente nomeação de pelo menos um Gerente por domínio.
- **Risco de inconsistência durante rollout faseado:** com a aplicação domínio por domínio, alguns domínios terão 4 níveis enquanto outros ainda terão 2. **Mitigação:** documentar status na seção "Histórico" deste ADR conforme cada domínio for migrado.

## Notas de Implementação

- A entrega piloto é o domínio Distribuição (ver `tasks/plataforma/prd-perfis-builtin-rbac/`).
- Os perfis pré-existentes (`*.default.consultor` e `*.default.analista`) **continuam** no catálogo após a entrega — não há renaming nem remoção.
- Carve-out controlado em Cadastro: a permissão `cadastro:default:titular:ver-cpf-completo` é adicionada ao catálogo de Cadastro nesta entrega (motivo: LGPD; ver ADR 0009), mas o refactor amplo de Cadastro segue como PRD futuro.

## Referências

- PRD: `tasks/plataforma/prd-perfis-builtin-rbac/prd.md`
- TechSpec: `tasks/plataforma/prd-perfis-builtin-rbac/techspec.md`
- ADR 0001 — Autenticação Logto + Autorização `ecad-authz`
- ADR 0002 — Convenção de naming `dominio:area:recurso:acao`
- ADR 0007 — Domínio transversal `acessos`
- ADR 0008 — BFF como gateway cross-cutting
- ADR 0009 — Mascaramento de CPF via permission-aware mapper
