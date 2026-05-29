# PRD — Catálogo de Perfis Built-in (Framework RBAC + Piloto Distribuição)

> **Domínio:** Plataforma / Cross-cutting (com piloto em Distribuição e novo domínio transversal Acessos)
> **Feature ID:** P-AUTHZ-02
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-05-25

---

## Visão Geral

O mcad opera hoje com 8 perfis built-in seedados via `seeds/mcad/roles.json` no `ecad-authz` central — dois por domínio (`*.default.consultor` e `*.default.analista`). A divisão binária read-only × full-write atendeu a primeira onda da migração de autorização, mas é grossa demais para o modelo de governança que o ECAD precisa exercer sobre ações sensíveis (irreversíveis, financeiras, alteração de status de processo, visualização de trilha de auditoria) e não explora a granularidade fina que a plataforma `ecad-authz` oferece (permissões 4-segmentos arbitrárias, decisão em tempo real, escopo por componente de UI além de rota).

Esta entrega tem três propósitos articulados:

1. **Framework cross-cutting** — estabelecer o catálogo padrão de quatro níveis por domínio de negócio (Consultor < Operador / Gerente < Analista — com Gerente e Analista em eixos distintos e segregados), a taxonomia de permissões (rota, ação de negócio, componente de UI, dados sensíveis, trilha de auditoria), as regras de naming e o ciclo de vida desses perfis built-in.
2. **Piloto em Distribuição** — aplicar o framework no domínio mais crítico (operações financeiras irreversíveis, segregação de funções obrigatória) e produzir o conjunto completo de quatro perfis + permissões granulares (rota + componente UI + histórico de alterações).
3. **Novo perfil cross-domain `acessos.default.gestor`** — introduzir o único perfil autorizado a atribuir e remover papéis de usuários no `ecad-authz`. Esse perfil não tem permissão de negócio (não enxerga processos, créditos, obras, etc.); seu único escopo é a gestão de quem tem qual papel. Resolve o problema atual de gestão de assignments ser feita via super-admin de authz (que mistura governança de catálogo com governança de pessoas).

O resultado tangível é um catálogo built-in que (a) habilita segregação de funções real entre quem opera (Operador / Analista) e quem governa/audita (Gerente), (b) cobre componentes de UI sensíveis (mascaramento de PII, exportações, ações destrutivas, trilhas de auditoria) com permissões dedicadas, (c) cria um eixo de governança de acessos (Gestor de Acessos) independente do super-admin de plataforma, e (d) deixa um padrão replicável documentado para que os demais domínios sigam o mesmo modelo em PRDs próprios sem reabrir a discussão.

---

## Rastreabilidade

### Vision Doc

- **Objetivos de negócio atendidos**:
  - Reforçar governança e auditoria sobre operações financeiras (eixo de compliance da plataforma ECAD).
  - Separar gestão de acessos (atribuição de papéis) de administração de catálogo de plataforma (operação técnica).
  - Demonstrar boas práticas de autorização fina como parte da PoC arquitetural.
- **Restrições globais aplicáveis**:
  - Plataforma de autorização externa centralizada (`ecad-authz` em `mcad-authz.tasso.dev.br`).
  - Padrão 4-segmentos para chaves de permissão (`dominio:area:recurso:acao`) — ADR 0002.
  - IdP corporativo continua sendo o Logto; este PRD não altera autenticação.
- **Non-Goals globais respeitados**:
  - Não introduz escopo `ASSOCIATION` (decisão de produto em aberto — herdado de `finalizar-integracao-authz/prd.md §3`).
  - Não substitui a camada própria `frontend/src/shared/authz/` por `@ecad/authz-react` (ADR 0005).

### Domain Doc

- **ID da feature primária do showcase**: D04 Distribuição — refinamento do RBAC sobre as features F01–F07.
- **Novo domínio transversal**: `acessos` (não corresponde a um domínio de negócio do Vision Doc; é um domínio de plataforma criado por este PRD para abrigar permissões de gestão de papéis).
- **Entidades envolvidas (Distribuição)**: Processo de Distribuição, Crédito, Crédito Retido, Liberação de Crédito Retido, Ajuste, Demonstrativo, Rubrica (cópia local).
- **Regras de negócio referenciadas (Distribuição)**: RN-05 (retenção), RN-06 (liberação), RN-07 (estorno → ajuste), RN-08 (idempotência), RN-12 (disparo manual pelo Analista), RN-13 (pré-requisitos do processo), RN-14 (publicação `distribuicao.rol.processado` em finalização).
- **Dependências upstream do framework**:
  - `tasks/finalizar-integracao-authz/` — baseline de testes E2E sobre a qual este catálogo será validado.
  - Plataforma `ecad-auditoria` (`/home/tsgomes/github-tassosgomes/ecad-auditoria/`) — serviço autônomo Java + Oracle que ingere eventos `SCREEN_ACCESS`, `USER_ACTION`, `DATA_CHANGE` via HTTP/AMQP e expõe `GET /entities/{entityType}/{entityId}/timeline`. **Já integrado pela Distribuição** via `audit-sdk-spring-boot-starter`: o domínio possui `ProcessoAuditEventFactory`, `ProcessoAuditChange`, `ProcessoSnapshot` e `HttpAuditContextProvider`. O contrato V1 suporta `DATA_CHANGE` com diff. Significa que a trilha de alterações exposta ao Gerente é uma query ao serviço de auditoria já existente, não um endpoint a ser construído do zero.
  - Backend Cadastro — para mascaramento server-side de CPF (ver RF-03). Requer adicionar a permissão `cadastro:default:titular:ver-cpf-completo` ao catálogo de Cadastro nesta entrega, antecipando-a do futuro PRD de perfis de Cadastro.
- **Dependências downstream**: os PRDs futuros `prd-perfis-builtin-arrecadacao`, `prd-perfis-builtin-cadastro`, `prd-perfis-builtin-identificacao` reusam o framework definido aqui.
- **Eventos consumidos**: nenhum diretamente — o catálogo opera sobre permissões.
- **Eventos produzidos**: nenhum — o `ecad-authz` é a fonte da decisão. Eventos de mudança de assignment já são publicados pelo próprio `ecad-authz`.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|---|---|
| Habilitar segregação real entre operação e governança em Distribuição | 100% das ações de status de Processo (`aprovar`, `finalizar`, `cancelar`) e da trilha de auditoria executáveis apenas por Gerente ou perfis explicitamente autorizados; verificado por suíte de testes de regressão de authz |
| Eliminar acúmulo indevido de permissões irreversíveis e de auditoria em perfis intermediários | Perfil Operador não possui nenhuma permissão classificada como "irreversível" nem de "trilha de auditoria" |
| Tornar exclusiva ao Gerente a visualização da trilha de alterações dos processos do seu domínio | Permissão `*:default:processo:ver-historico-alteracoes` presente apenas em perfis Gerente (e ausente em Operador, Consultor e Analista) |
| Reduzir exposição de dados sensíveis na UI (PII de titular, valores monetários consolidados, justificativas) | Pelo menos 4 componentes de UI em Distribuição com visibilidade controlada por permissão dedicada (não derivada de rota) |
| Separar gestão de acessos de administração de plataforma authz | Único perfil com permissão `acessos:default:papel:atribuir` é `acessos.default.gestor`; super-admin de authz mantém capacidade técnica mas o caminho recomendado e auditado é via Gestor |
| Escopar a visão de papéis atribuídos para o Gerente | Gerente do domínio X só vê assignments envolvendo perfis do domínio X; verificado por teste e por design da consulta |
| Estabelecer padrão replicável para os 3 demais domínios | Framework + showcase Distribuição aprovado; PRDs subsequentes podem ser produzidos sem reabrir as decisões |
| Manter compatibilidade com usuários reais já atribuídos | Zero usuário existente perde acesso involuntariamente |

---

## Histórias de Usuário

- Como **Diretor de Governança ECAD**, eu quero que ações irreversíveis em um Processo de Distribuição (finalizar, cancelar) só possam ser feitas por perfis explicitamente atribuídos como gerentes, e que esses gerentes sejam também os únicos a consultar o histórico de alterações daquele processo, para que segregação de funções e auditoria sejam exercidas na prática.
- Como **Analista de Distribuição**, eu quero criar, calcular e recalcular processos sem precisar pedir aprovação a cada operação, e quero ter acesso a ações excepcionais (liberação manual de retidos, exportações, PII completo) quando o cenário exigir, mas eu não preciso ter acesso à trilha de auditoria — entendo que isso é responsabilidade do Gerente do domínio.
- Como **Gerente de Distribuição**, eu quero ver a lista completa de alterações que cada perfil do meu domínio (Consultor, Operador, Analista, e eu mesmo) realizou em cada Processo, para que eu cumpra minha função de governança sem precisar pedir log de aplicação ao time técnico.
- Como **Gestor de Acessos**, eu quero ter um perfil único e claramente delimitado para atribuir e remover papéis dos usuários, sem precisar do super-admin de plataforma, e sem que eu enxergue dados de negócio (não preciso ver processos, créditos, obras), para que minha atuação fique restrita a quem-tem-qual-papel.
- Como **Auditor / Compliance Officer**, eu quero confiar que o Gerente do domínio X vê apenas assignments daquele domínio, e que somente o Gestor de Acessos modifica papéis, para que a separação de eixos seja defensável em auditoria externa.
- Como **Operador de Suporte**, eu quero ter acesso a listas e detalhes de processos sem ver CPF completo do titular, sem ver justificativas de cancelamento e sem permitir exportação, para que eu cumpra LGPD enquanto resolvo chamados de suporte.
- Como **Desenvolvedor mcad**, eu quero seguir um padrão único (mesma divisão Consultor/Operador/Gerente/Analista) ao adicionar permissões em qualquer domínio de negócio novo, para que UI, backend e seed permaneçam consistentes sem reabrir discussões de modelo.

---

## Funcionalidades Principais

### RF-01: Estrutura canônica de quatro níveis por domínio de negócio

**Descrição**: Cada domínio de negócio do mcad (Cadastro, Identificação, Arrecadação, Distribuição) passa a expor quatro perfis built-in. Diferentemente de uma hierarquia estritamente subordinante, **Gerente e Analista são eixos distintos e parcialmente sobrepostos**, com segregação de funções entre operação avançada (Analista) e governança/auditoria (Gerente).

| Perfil | Eixo | Semântica | Tipicamente faz |
|---|---|---|---|
| **Consultor** | Leitura | Leitura básica do domínio | Listar, visualizar, abrir telas read-only |
| **Operador** | Operação | Operações reversíveis e idempotentes | Criar, editar, recalcular idempotente; nunca decide status nem audita |
| **Gerente** | Governança / Auditoria | Decisões de status (incluindo irreversíveis inerentes ao fluxo) + visualização exclusiva da trilha de auditoria do domínio + visualização escopada do catálogo de assignments daquele domínio | Aprovar, finalizar, cancelar; ler histórico de alterações; consultar quem tem qual papel no seu domínio |
| **Analista** | Operação sênior | Conjunto amplo da operação, inclusive ações ultra-sensíveis e excepcionais — sem auditoria | Criar, editar, calcular, recalcular pós-CALCULADO, liberar retido manualmente, ver PII completo, exportar; **não** vê histórico de alterações nem catálogo de assignments |

**Critérios de Aceitação**:

- **Given** um domínio de negócio do mcad
  **When** consulto o catálogo built-in em `seeds/mcad/roles.json`
  **Then** existem quatro entradas para esse domínio nas chaves `{dominio}.default.{consultor,operador,gerente,analista}` com nomes amigáveis, descrição e lista de `permissionKeys`.

- **Given** os quatro perfis de um mesmo domínio
  **When** comparo as listas de `permissionKeys`
  **Then** Consultor ⊂ Operador e Consultor ⊂ Analista na dimensão de leitura básica; Operador ⊂ Analista na dimensão de operação; **Gerente NÃO está contido em Analista** porque possui permissões de auditoria/governança exclusivas; **Analista NÃO está contido em Gerente** porque possui permissões de operação sensível exclusivas.

- **Given** uma ação classificada como irreversível ou destrutiva (lista definida em RF-03)
  **When** verifico em qual perfil ela aparece
  **Then** ela aparece em Gerente (quando é decisão inerente ao fluxo, ex.: `finalizar`) e/ou em Analista (quando é exceção operacional, ex.: `recalcular-pos-calculado`), mas nunca em Operador nem em Consultor.

- **Given** uma permissão de auditoria/trilha de alterações
  **When** verifico em qual perfil ela aparece
  **Then** ela aparece **exclusivamente** em Gerente — nem Analista, nem Operador, nem Consultor a possuem.

**Prioridade**: Must Have

**Rastreabilidade**: ADR 0002 (4-segment naming), RN-12 (disparo manual — agora generalizado para Operador, Gerente ou Analista conforme a ação).

---

### RF-02: Taxonomia de permissões com cinco categorias

**Descrição**: O catálogo classifica cada permissão em uma das cinco categorias abaixo. A categoria não muda a chave em si (mantém 4-segmentos) mas é registrada no campo `description` do catálogo `ecad-authz` e na documentação para guiar atribuição em novos perfis.

| Categoria | Definição | Exemplo (Distribuição) |
|---|---|---|
| **Leitura** | Permite consulta. Não muda estado. | `distribuicao:default:processo:listar`, `distribuicao:default:processo:visualizar` |
| **Operação reversível** | Cria/edita ou dispara ações idempotentes; pode ser refeita sem perda de dado. | `distribuicao:default:processo:criar`, `distribuicao:default:processo:calcular` |
| **Decisão de status** | Move o objeto na máquina de estados. Algumas decisões são intrinsecamente irreversíveis. | `distribuicao:default:processo:aprovar`, `distribuicao:default:processo:finalizar`, `distribuicao:default:processo:cancelar` |
| **Ação sensível / componente UI** | Granularidade fina dentro de tela ou dado: mascaramento, exportação, força bruta. Não corresponde a rota HTTP única. | `distribuicao:default:credito:ver-cpf-titular`, `distribuicao:default:processo:exportar`, `distribuicao:default:credito-retido:liberar-manual` |
| **Trilha de auditoria** | Acesso ao histórico de alterações e logs de governança do domínio. **Exclusiva do Gerente.** | `distribuicao:default:processo:ver-historico-alteracoes`, `distribuicao:default:credito:ver-historico-alteracoes` |

**Critérios de Aceitação**:

- **Given** uma nova permissão a ser registrada no catálogo
  **When** o seed `seeds/mcad/{dominio}.permissions.json` é editado
  **Then** o `description` cita a categoria entre colchetes no início (ex.: `[Decisão de status] Aprova o cálculo (CALCULADO → APROVADO)`).

- **Given** uma permissão de categoria "Trilha de auditoria"
  **When** o catálogo é seedado e os perfis são gerados
  **Then** essa permissão aparece exclusivamente no perfil Gerente do domínio correspondente.

- **Given** uma permissão de categoria "Ação sensível / componente UI"
  **When** o catálogo é seedado
  **Then** o frontend tem um ponto de uso correspondente via `usePermissions` / `<RequirePermission>` que controla o componente, e há teste unitário cobrindo o ramo sem permissão.

**Prioridade**: Must Have

**Rastreabilidade**: ADR 0002.

---

### RF-03: Mapa de permissões do piloto Distribuição

**Descrição**: O domínio Distribuição passa a expor o catálogo abaixo. As permissões existentes hoje (lista em `seeds/mcad/distribuicao.permissions.json`) são preservadas e classificadas; permissões marcadas com **(NOVO)** são adicionadas como UI, sensível ou trilha de auditoria.

| Chave | Categoria | Consultor | Operador | Gerente | Analista |
|---|---|---|---|---|---|
| `distribuicao:default:rubrica:listar` | Leitura | ✓ | ✓ | ✓ | ✓ |
| `distribuicao:default:rubrica:visualizar` | Leitura | ✓ | ✓ | ✓ | ✓ |
| `distribuicao:default:processo:listar` | Leitura | ✓ | ✓ | ✓ | ✓ |
| `distribuicao:default:processo:visualizar` | Leitura | ✓ | ✓ | ✓ | ✓ |
| `distribuicao:default:processo:criar` | Operação reversível |  | ✓ |  | ✓ |
| `distribuicao:default:processo:calcular` | Operação reversível |  | ✓ |  | ✓ |
| `distribuicao:default:processo:aprovar` | Decisão de status |  |  | ✓ | ✓ |
| `distribuicao:default:processo:finalizar` | Decisão de status (irrev.) |  |  | ✓ | ✓ |
| `distribuicao:default:processo:cancelar` | Decisão de status (irrev.) |  |  | ✓ | ✓ |
| `distribuicao:default:credito:listar` **(NOVO)** | Leitura | ✓ | ✓ | ✓ | ✓ |
| `distribuicao:default:credito:visualizar` **(NOVO)** | Leitura | ✓ | ✓ | ✓ | ✓ |
| `cadastro:default:titular:ver-cpf-completo` **(NOVO, cross-domain)** | Ação sensível / UI |  |  | ✓ | ✓ |
| `distribuicao:default:processo:exportar` **(NOVO)** | Ação sensível / UI |  |  | ✓ | ✓ |
| `distribuicao:default:processo:ver-justificativa-cancelamento` **(NOVO)** | Ação sensível / UI |  |  | ✓ | ✓ |
| `distribuicao:default:processo:recalcular-pos-calculado` **(NOVO)** | Ação sensível / UI |  |  |  | ✓ |
| `distribuicao:default:credito-retido:liberar-manual` **(NOVO)** | Ação sensível / UI |  |  |  | ✓ |
| `distribuicao:default:processo:ver-historico-alteracoes` **(NOVO)** | Trilha de auditoria |  |  | ✓ |  |
| `distribuicao:default:credito:ver-historico-alteracoes` **(NOVO)** | Trilha de auditoria |  |  | ✓ |  |
| `distribuicao:default:demonstrativo:visualizar` **(NOVO, depende F07)** | Leitura | ✓ | ✓ | ✓ | ✓ |
| `distribuicao:default:demonstrativo:exportar` **(NOVO, depende F07)** | Ação sensível / UI |  |  | ✓ | ✓ |

**Critérios de Aceitação**:

- **Given** um usuário com perfil `distribuicao.default.operador`
  **When** chama `POST /api/v1/processos/{id}/aprovar`
  **Then** recebe 403 com `{code: "PERMISSION_DENIED"}` (verificado via `ecad-authz` Decision API).

- **Given** um usuário com perfil `distribuicao.default.analista` na tela `ProcessoDetailPage`
  **When** ele tenta abrir a aba/seção "Histórico de Alterações"
  **Then** o componente não é renderizado e a chamada à API correspondente retorna 403 (a permissão é exclusiva do Gerente).

- **Given** um usuário com perfil `distribuicao.default.gerente` na tela `ProcessoDetailPage`
  **When** abre a aba "Histórico de Alterações" de um processo
  **Then** o frontend consulta o serviço `ecad-auditoria` em `GET /entities/Processo/{id}/timeline` (intermediado pelo BFF, que verifica a permissão antes de proxar) e renderiza a lista cronológica de eventos `USER_ACTION` e `DATA_CHANGE`. Para `DATA_CHANGE`, o diff `before`/`after` do contrato V1 está disponível para exibição. Cada item exibe subject, timestamp, tipo de evento e payload contextual.

- **Given** um usuário com perfil `distribuicao.default.consultor` na tela `ProcessoDetailPage`
  **When** a página renderiza com um processo em status CANCELADO
  **Then** a seção "Dados do Cancelamento" e a justificativa não são exibidas (oculto pela permissão `processo:ver-justificativa-cancelamento`).

- **Given** um usuário com perfil `distribuicao.default.gerente` na tela `ProcessoDetailPage`
  **When** a página renderiza um processo em status APROVADO
  **Then** o botão "Finalizar" está visível e habilitado; o botão "Recalcular" (caso exista) está oculto (controlado por `processo:recalcular-pos-calculado`, exclusivo do Analista).

- **Given** um usuário com perfil `distribuicao.default.gerente` ou `distribuicao.default.analista` (ambos com `cadastro:default:titular:ver-cpf-completo`) na listagem de créditos
  **When** a linha do crédito é renderizada
  **Then** o CPF do titular é exibido em formato completo. Para Consultor, Operador e perfis sem essa permissão, é exibido mascarado (XXX.***.***-XX).

- **Given** o backend Cadastro (que é dono do dado CPF)
  **When** qualquer cliente (incluindo Distribuição via ACL) consulta um Titular
  **Then** a resposta retorna `Documento`/`DocumentoFormatado` mascarado por padrão; o CPF completo só é retornado quando o JWT do caller contém a permissão `cadastro:default:titular:ver-cpf-completo` — mascaramento aplicado server-side, não burlável pelo frontend.

- **Given** o catálogo de Cadastro após o seed desta entrega
  **When** consulto o perfil `cadastro.default.analista`
  **Then** ele contém a nova permissão `cadastro:default:titular:ver-cpf-completo` — garantindo que usuários atualmente atribuídos a esse perfil em produção (incluindo `analista.dev` e usuários reais) continuem vendo CPF completo após o re-seed.

> **Carve-out controlado em Cadastro**: esta entrega adiciona exatamente uma permissão ao catálogo de Cadastro (`titular:ver-cpf-completo`) e a inclui no perfil pré-existente `cadastro.default.analista`. Esse é um carve-out mínimo justificado pela LGPD para não esperar o PRD de Cadastro chegar. O refactor amplo dos perfis de Cadastro (Operador, Gerente, demais permissões de UI) continua sendo trabalho do futuro PRD `prd-perfis-builtin-cadastro`.

- **Given** um usuário sem permissão `distribuicao:default:credito-retido:liberar-manual`
  **When** acessa a tela (futura) de créditos retidos
  **Then** o botão "Liberar manualmente" não é renderizado e o endpoint correspondente (a definir em TechSpec) retorna 403 quando chamado diretamente.

**Prioridade**: Must Have

**Rastreabilidade**: RN-05, RN-06, RN-12, RN-13, RN-14 do Domain Doc de Distribuição.

---

### RF-04: Perfis cross-domain do novo domínio `acessos`

**Descrição**: Cria-se um novo domínio transversal `acessos` no `ecad-authz` (não corresponde a um domínio de negócio do Vision Doc) que abriga as permissões de **gestão de papéis de usuários** e a sua auditoria. Esse domínio expõe **dois** perfis built-in nesta entrega:

- **`acessos.default.gestor`** — único caminho recomendado e auditado para atribuição/remoção de papéis no mcad.
- **`acessos.default.consultor`** — perfil de auditoria/compliance read-only. Vê catálogo de perfis, lista usuários e seus papéis, vê histórico de atribuições; **não** atribui nem remove. Útil para Compliance Officer externo.

Permissões introduzidas no domínio `acessos`:

| Chave | Categoria | Gestor | Consultor de Acessos |
|---|---|---|---|
| `acessos:default:papel:listar` | Leitura | ✓ | ✓ |
| `acessos:default:papel:visualizar` | Leitura | ✓ | ✓ |
| `acessos:default:usuario:listar` | Leitura | ✓ | ✓ |
| `acessos:default:usuario:visualizar-papeis-completo` | Leitura | ✓ | ✓ |
| `acessos:default:atribuicao:ver-historico` | Trilha de auditoria | ✓ | ✓ |
| `acessos:default:papel:atribuir` | Operação reversível | ✓ |  |
| `acessos:default:papel:remover` | Operação reversível | ✓ |  |

Nem Gestor nem Consultor de Acessos têm permissões de domínio de negócio. Nenhum dos dois vê processos, créditos, obras, captações, clientes, pagamentos. A única visão é o catálogo de perfis e os assignments existentes.

**Critérios de Aceitação**:

- **Given** o catálogo built-in pós-seed
  **When** consulto `GET /v1/roles?domain=acessos`
  **Then** existem exatamente duas entradas: `acessos.default.gestor` (7 permissões) e `acessos.default.consultor` (5 permissões — sem `papel:atribuir` nem `papel:remover`).

- **Given** um usuário com perfil `acessos.default.consultor`
  **When** tenta `POST /v1/users/{id}/roles`
  **Then** recebe 403. Quando consulta `GET /v1/users` e `GET /v1/users/{id}/roles`, recebe 200 com os dados.

- **Given** um usuário com perfil `acessos.default.gestor`
  **When** chama `POST /v1/users/{id}/roles` com `roleKey=cadastro.default.gerente`
  **Then** a atribuição é aceita e registrada com sucesso.

- **Given** um usuário com perfil `acessos.default.gestor`
  **When** chama `GET /api/v1/processos` (endpoint de Distribuição)
  **Then** recebe 403 — Gestor de Acessos não tem permissões de negócio.

- **Given** um usuário sem perfil `acessos.default.gestor` nem super-admin de authz
  **When** tenta `POST /v1/users/{id}/roles`
  **Then** recebe 403.

- **Given** o super-admin de plataforma authz (`authz:admin:*`)
  **When** tenta atribuir papéis
  **Then** mantém capacidade técnica (caminho de break-glass), mas a recomendação documentada e o caminho de auditoria padrão é via Gestor de Acessos.

**Prioridade**: Must Have

---

### RF-05: Visualização escopada de assignments pelo Gerente

**Descrição**: O Gerente de um domínio enxerga, com escopo restrito, **apenas os assignments cujos roles pertencem ao seu domínio**. Por exemplo, um usuário com `distribuicao.default.gerente` vê (a) quais usuários têm `distribuicao.default.{consultor,operador,gerente,analista}` e (b) o histórico de mudanças dessas atribuições; **não** vê quem é Operador de Cadastro nem assignments em outros domínios.

Para suportar isso, o domínio `acessos` introduz a permissão escopada por domínio:

| Chave | Categoria | Descrição |
|---|---|---|
| `acessos:{dominio}:papel:visualizar` | Leitura | Vê assignments envolvendo papéis do domínio `{dominio}` |
| `acessos:{dominio}:atribuicao:ver-historico` | Trilha de auditoria | Vê histórico de atribuições para papéis do domínio `{dominio}` |

Onde `{dominio}` ∈ `{cadastro, identificacao, arrecadacao, distribuicao}`. Essas permissões são automaticamente incluídas no perfil Gerente do domínio correspondente.

**Critérios de Aceitação**:

- **Given** um usuário com perfil `distribuicao.default.gerente` (e nada mais)
  **When** acessa a tela de "Acessos do meu domínio" (a definir em TechSpec)
  **Then** vê apenas os usuários que possuem algum perfil em `distribuicao.default.*`; outros assignments não aparecem.

- **Given** o mesmo usuário Gerente de Distribuição
  **When** chama o endpoint correspondente em `ecad-authz` (ou via BFF) listando assignments
  **Then** o filtro por `domain=distribuicao` é aplicado automaticamente; tentar passar `domain=cadastro` resulta em 403 ou lista vazia (a definir em TechSpec).

- **Given** um Gestor de Acessos
  **When** acessa a mesma consulta
  **Then** vê assignments de todos os domínios (não há filtro automático).

- **Given** um usuário com perfil `distribuicao.default.analista`
  **When** tenta acessar a tela de Acessos do domínio
  **Then** recebe acesso negado — Analista não tem nem `acessos:default:papel:visualizar` nem `acessos:distribuicao:papel:visualizar`.

**Prioridade**: Must Have

---

### RF-06: Convenção de nome e ciclo de vida dos perfis built-in

**Descrição**: Define como perfis built-in são nomeados, versionados, criados, alterados e depreciados.

- **Naming**: `{dominio}.{area}.{nivel}` onde:
  - Para domínios de negócio: `{dominio}` ∈ `{cadastro, identificacao, arrecadacao, distribuicao}`, `{area}` = `default`, `{nivel}` ∈ `{consultor, operador, gerente, analista}`.
  - Para o domínio transversal de acessos: `acessos.default.gestor`.
  - Outras áreas (ex.: `cadastro.musical.consultor`) ficam fora de escopo desta entrega.
- **displayName** sempre em português, padrão `"{Nível} {Domínio}"` (ex.: `Gerente Distribuição`, `Gestor de Acessos`).
- **description** inicia com `[Built-in]` e cita brevemente o que o perfil engloba.
- **permissionKeys** é a fonte de verdade do mapeamento; cada alteração exige bump de versão no header do JSON e atualização da seção "Histórico" deste PRD.
- **Ciclo de vida**: perfis built-in são imutáveis em assignments — apenas o seed cria/atualiza. Qualquer alteração de catálogo passa por PR + re-seed; a operação concreta de atribuição a usuários é feita pelo Gestor de Acessos.

**Critérios de Aceitação**:

- **Given** o arquivo `seeds/mcad/roles.json`
  **When** inspeciono qualquer perfil built-in
  **Then** ele segue o naming, possui `displayName`, `description` iniciando com `[Built-in]` e a lista `permissionKeys` está populada.

- **Given** uma mudança nas `permissionKeys` de um perfil built-in
  **When** o PR é aberto
  **Then** este PRD recebe uma entrada na seção "Histórico" (a ser adicionada após aprovação) e o script `./scripts/seed-authz.sh --dry-run` mostra a diferença esperada.

**Prioridade**: Must Have

---

### RF-07: Migração e backward compatibility

**Descrição**: Usuários atualmente atribuídos a `*.default.consultor` ou `*.default.analista` mantêm seus assignments. Os dois perfis pré-existentes permanecem no catálogo após a entrega; apenas a divisão semântica intermediária (Operador, Gerente) é nova. Operadores e Gerentes são preenchidos sob demanda pelo Gestor de Acessos quando a governança ECAD decidir reatribuir usuários existentes.

**Critérios de Aceitação**:

- **Given** um usuário real (ex.: `tsgomes`) com `cadastro.default.analista` no ambiente de produção
  **When** o seed novo é aplicado
  **Then** o usuário continua com o assignment original e nada quebra na sessão atual.

- **Given** o catálogo pós-seed em produção
  **When** consulto `GET /v1/roles?domain=distribuicao`
  **Then** existem quatro entradas (`consultor`, `operador`, `gerente`, `analista`) e nenhuma das antigas foi removida.

- **Given** o usuário com `cadastro.default.analista` da migração antiga
  **When** ele entra em telas onde, no modelo novo, apenas o Gerente verá o histórico de alterações
  **Then** ele NÃO vê esse histórico (a permissão exclusiva nunca esteve no perfil Analista, mesmo no modelo antigo, então não há perda perceptível — mas a expectativa de "Analista vê tudo" deixa de valer; isso fica documentado no comunicado de release).

**Prioridade**: Must Have

---

### RF-08: Documentação de governança e ADR de framework

**Descrição**: Produzir um ADR consolidando: (a) a estrutura de quatro níveis com Gerente e Analista em eixos distintos; (b) a taxonomia de cinco categorias incluindo Trilha de Auditoria; (c) o novo domínio transversal `acessos`; (d) a convenção de naming; (e) o critério para classificar uma ação como irreversível, ação sensível, trilha de auditoria ou operação reversível. Esse ADR é referenciado pelos PRDs subsequentes de outros domínios.

**Critérios de Aceitação**:

- **Given** o término da Fase 2 desta entrega
  **When** consulto `docs/adr/`
  **Then** existe um novo ADR (provavelmente `0006-perfis-built-in-rbac.md`) com as decisões documentadas, status `Accepted` e referência a este PRD.

- **Given** um PRD futuro para Cadastro/Identificação/Arrecadação
  **When** o autor lê o ADR
  **Then** o trabalho de modelagem do catálogo para aquele domínio consiste em aplicar o framework, não em re-discutir as decisões.

**Prioridade**: Should Have

---

## Experiência do Usuário

### Personas e fluxos

- **Operador de Distribuição**: Acessa `/distribuicao/processos`, vê listagem, cria um novo processo (botão "Criar Processo" visível), abre detalhe, dispara "Calcular". Não vê os botões "Aprovar", "Finalizar" nem "Cancelar". Não vê a aba/seção "Histórico de Alterações". Não acessa a tela de Acessos. Vê valor da verba líquida, mas CPF de titular nas listas de crédito aparece mascarado.

- **Gerente de Distribuição**: Após o Operador calcular, abre o detalhe do processo, vê o resumo do cálculo, clica "Aprovar". Em estado APROVADO, vê o botão "Finalizar" (com modal de confirmação) e pode cancelar com justificativa. Pode exportar o processo. **Tem aba/seção exclusiva "Histórico de Alterações"** com toda a trilha de quem operou o processo, alimentada pelo timeline do `ecad-auditoria`. Acessa "Acessos do meu domínio" e vê quais usuários têm perfis de Distribuição. Vê CPF completo (responsabilidade de governança implica acesso a PII para verificação).

- **Analista de Distribuição**: Vê listagem, cria, edita, calcula. Tem botões adicionais para cenários excepcionais (recálculo manual após CALCULADO, liberação manual de retido). Vê CPF completo. Pode exportar tudo. **Não vê "Histórico de Alterações"** (isso é função do Gerente). Não acessa tela de Acessos.

- **Consultor de Distribuição**: Lista e visualiza. Filtros funcionam. Nenhum botão de ação aparece. Justificativa de cancelamento não aparece. CPF aparece mascarado. Sem aba de auditoria. Sem tela de acessos.

- **Gestor de Acessos**: Acessa uma tela dedicada (a especificar na TechSpec) onde vê o catálogo completo de perfis built-in (em todos os domínios), pode buscar usuários, atribuir/remover papéis. Não vê telas de negócio. Tem trilha completa de auditoria de assignments.

### Considerações de UI

- Botões de ação são suprimidos via `<RequirePermission permission="...">` no nível do componente, não apenas no nível da rota.
- Componentes de exibição sensível (CPF, valores consolidados, justificativas) usam o mesmo padrão de gating de componente.
- A aba "Histórico de Alterações" é renderizada como uma seção/aba adicional na `ProcessoDetailPage` apenas para o Gerente. Não há "placeholder cinza" para outros perfis — a aba simplesmente não existe na navegação deles.
- A tela "Acessos do meu domínio" tem layout análogo à tela atual `/autorizacao/papeis`, mas a consulta é pré-filtrada pelo(s) domínio(s) em que o usuário é Gerente.
- A tela "Gestão de Acessos" (Gestor de Acessos) é distinta da admin UI atual de `/autorizacao` — pode reusar componentes mas o caminho de menu é diferente para deixar claro o eixo de responsabilidade.
- Mensagens de erro 403 em chamadas diretas (URL forjada) preservam o envelope `{code, message, correlationId}` já padronizado.
- Acessibilidade: nada muda na semântica de aria; permissões só removem componentes, não desabilitam visualmente com cor sem alternativa.

### Onboarding

- Quando o Gestor de Acessos atribui um perfil pela tela dedicada, o `displayName` e a `description` (com prefixo `[Built-in]`) e o resumo das permissões ajudam a explicar o que aquele papel autoriza.

---

## Restrições Técnicas de Alto Nível

- O catálogo permanece centralizado no `ecad-authz`. Não há cache de decisão de longo prazo no mcad — TTL respeita o que já está configurado no BFF (`ME_CACHE_TTL_SECONDS`).
- Naming de permissões obrigatoriamente 4-segmentos (ADR 0002). Permissões herdadas em 3-segmentos não são introduzidas; o normalizador residual do BFF (`docs/migracao-authz/proximos-passos.md §2.4`) permanece intocado por esta entrega.
- O frontend continua usando `usePermissions` / `can()` da camada própria `frontend/src/shared/auth/` — sem migração para `@ecad/authz-react` (ADR 0005).
- Conformidade LGPD: permissões de mascaramento (`ver-cpf-titular`) e exportação (`processo:exportar`, `demonstrativo:exportar`) precisam constar do inventário de tratamento de dados.
- **Histórico de alterações**: o backend de Distribuição precisa expor um endpoint específico para a trilha de alterações por processo. Se ainda não existir, a TechSpec deve especificar (provavelmente derivada de eventos já publicados via Outbox + tabela de audit local). Implementação concreta fica para TechSpec.
- **Escopo automático do Gerente em queries de assignments**: o filtro por domínio é responsabilidade do BFF ou do `ecad-authz` (decisão da TechSpec). O comportamento esperado é descrito em RF-05.

---

## Não-Objetivos (Fora de Escopo)

- **Aplicação do framework em Cadastro, Identificação e Arrecadação** — cada um vira um PRD próprio, que reusa o framework definido aqui. Esta entrega para apenas em Distribuição, mais (a) o domínio cross-domain `acessos` e (b) **um único carve-out em Cadastro**: a permissão `cadastro:default:titular:ver-cpf-completo` adicionada ao catálogo e incluída em `cadastro.default.analista`. Não há criação de Operador/Gerente em Cadastro nesta entrega.
- **Outros perfis no domínio `acessos`** (ex.: `acessos.default.consultor` para auditoria read-only de assignments) — fica fora desta entrega; pode entrar em PRD posterior se a demanda surgir.
- **Substituição do super-admin de plataforma authz por Gestor de Acessos** — o super-admin (`authz:admin:*`) continua existindo como caminho técnico de break-glass; este PRD apenas estabelece o Gestor de Acessos como caminho recomendado e auditado para operações de assignment do dia a dia.
- **Escopo `ASSOCIATION` ou multi-tenant** — herdado de `finalizar-integracao-authz/prd.md` e mantido fora.
- **Dual-control / aprovação por dois perfis simultâneos** — modelo de approval workflow embutido foi explicitamente considerado e rejeitado (ver Alternativas Consideradas).
- **Reatribuição automática de usuários existentes** — `tsgomes`, `t3crjdamuir4`, etc. continuam com seus papéis atuais. A reatribuição para Operador, Gerente ou Gestor de Acessos é decisão de produto/governança, fora do escopo técnico desta entrega.
- **Mudanças no contrato de Decision API do `ecad-authz`** — apenas conteúdo de catálogo muda. Endpoints novos no BFF (ex.: query escopada de assignments) podem ser necessários, mas a Decision API permanece intacta.
- **Audit trail enriquecido com diff de dados** — o histórico de alterações exposto ao Gerente lista quem/quando/o quê. O conteúdo detalhado pré/pós (diff) é uma evolução futura possível, mas não está garantida nesta entrega.
- **Tracing OpenTelemetry estruturado para decisões authz** — herdado como Non-Goal de `finalizar-integracao-authz/prd.md §3`.

---

## Plano de Rollout Faseado

### MVP (Fase 1) — Framework + Distribuição + Gestor de Acessos em DEV

- **Funcionalidades incluídas**: RF-01, RF-02, RF-03 (parcial — permissões existentes reclassificadas + 4 permissões UI novas + 2 de Trilha de Auditoria), RF-04 (Gestor de Acessos completo), RF-05 (visualização escopada), RF-06, RF-07.
- **Critérios de sucesso para avançar à Fase 2**:
  - `seeds/mcad/roles.json` contém quatro perfis para Distribuição + um perfil para `acessos`.
  - `seed-authz.sh --dry-run` em DEV mostra exatamente as criações esperadas.
  - Usuários de teste a criar no IdP (Logto) e atribuir no `ecad-authz` via Gestor de Acessos:
    - `operador.dev@mcad.local` (subjectHint `operador.dev`) — atribuído a `distribuicao.default.operador`
    - `gerente.dev@mcad.local` (subjectHint `gerente.dev`) — atribuído a `distribuicao.default.gerente`
    - `gestor-acessos.dev@mcad.local` (subjectHint `gestor-acessos.dev`) — atribuído a `acessos.default.gestor`
    - `consultor-acessos.dev@mcad.local` (subjectHint `consultor-acessos.dev`) — atribuído a `acessos.default.consultor`
    - `analista.dev@mcad.local` e `consultor.dev@mcad.local` permanecem como hoje (`seeds/mcad/assignments.json`) — agora servem também aos cenários de regressão Analista/Consultor da nova taxonomia.
  - Suíte de testes do BFF + Distribuição API cobre os quatro perfis × pelo menos as 9 rotas existentes + endpoint(s) de histórico de alterações (3 estados: sem JWT, sem permissão, com permissão).
  - Pelo menos 4 componentes de UI gateados por permissão dedicada (mascaramento CPF, justificativa de cancelamento, botão exportar, botão recalcular) + aba de Histórico de Alterações exclusiva do Gerente.
  - Tela "Gestão de Acessos" do Gestor funcional e tela "Acessos do meu domínio" do Gerente funcional, ambas no frontend.

### Fase 2 — Produção + ADR

- **Funcionalidades adicionais**: RF-08 (ADR publicado), RF-03 completa (permissões adicionais quando F07 Demonstrativo chegar à codebase).
- **Critérios de sucesso para avançar à Fase 3**:
  - Re-seed em produção concluído sem regressão de acesso para usuários existentes.
  - ADR aprovado e mergado em `docs/adr/`.
  - Pelo menos um Gestor de Acessos real atribuído e ativo.
  - Métricas de sucesso avaliadas em pelo menos um ciclo de distribuição mensal.

### Fase 3 (Conjunto Completo) — Propagação para outros domínios

- **Funcionalidades restantes**: produção dos PRDs análogos para Arrecadação (`prd-perfis-builtin-arrecadacao`), Cadastro (`prd-perfis-builtin-cadastro`) e Identificação (`prd-perfis-builtin-identificacao`).
- **Critérios de sucesso de longo prazo**: catálogo built-in com 16 perfis de negócio (4 × 4 domínios) + perfil(is) de Acessos consistente; cada domínio com pelo menos 2 permissões de "Ação sensível / componente UI" e 2 de "Trilha de auditoria".

---

## Métricas de Sucesso

| Métrica | Definição | Valor-alvo | Prazo |
|---|---|---|---|
| Cobertura de perfis built-in no piloto | (# perfis de Distribuição no seed) ÷ 4 | 100% (= 4/4) | Encerramento da Fase 1 |
| Cobertura de testes de autorização por perfil | (# rotas + componentes testados para cada um dos 4 perfis de Distribuição + Gestor de Acessos) ÷ (# total rotas + componentes) | ≥ 90% | Encerramento da Fase 1 |
| Componentes de UI gateados por permissão dedicada (não-rota) | Contagem absoluta em Distribuição | ≥ 4 | Encerramento da Fase 1 |
| Permissões de Trilha de Auditoria implementadas | Contagem absoluta no perfil Gerente de Distribuição | ≥ 2 | Encerramento da Fase 1 |
| Atribuições de papéis realizadas pelo Gestor de Acessos | (# operações `papel:atribuir`/`papel:remover` executadas por `acessos.default.gestor`) ÷ (total via Gestor + via super-admin) | ≥ 80% | 30 dias após Fase 2 |
| Usuários existentes que perderam acesso involuntariamente | Contagem absoluta após re-seed | 0 | Encerramento da Fase 2 |
| Tempo médio para um novo PRD de domínio reusar o framework | Cronometragem do brainstorming → PRD aprovado | ≤ 2 horas | Encerramento da Fase 3 |
| Incidentes de governança evitados (ações irreversíveis bloqueadas por permissão) | Eventos de 403 capturados em telemetria por mês após a entrega | ≥ 1 nas primeiras 4 semanas | 30 dias após Fase 2 |

---

## Riscos e Mitigações

- **Risco de adoção do Gerente**: governança ECAD pode não nomear Gerentes nos domínios, deixando a aba "Histórico de Alterações" inutilizada. **Mitigação**: incluir, junto da entrega, recomendação explícita de mapping de pelo menos um Gerente por domínio na seção de runbook do ADR.
- **Risco do Gestor de Acessos ser ignorado**: time pode continuar usando super-admin de plataforma para atribuir papéis "porque já está acostumado". **Mitigação**: documentar caminho recomendado, adicionar warning na admin UI antiga, monitorar métrica de "atribuições via Gestor vs super-admin".
- **Risco de UX**: Analista pode perceber a perda de acesso ao histórico de alterações como regressão (mesmo nunca tendo tido formalmente). **Mitigação**: comunicado de release explicando segregação de funções; oferecer transição "Analista que precisa ver auditoria = atribuir também `*.default.gerente`".
- **Risco do filtro escopado vazar**: query de assignments pode acidentalmente retornar dados de outros domínios para o Gerente. **Mitigação**: teste de regressão dedicado + revisão de SQL/HTTP; aplicar denyset positivo (lista de domínios permitidos derivada dos perfis Gerente do usuário) em vez de blacklist.
- **Risco de prazo**: implementar permissões UI + aba de histórico de alterações exige tocar várias telas + criar endpoints novos. **Mitigação**: priorizar `ProcessoDetailPage` (aba de histórico) e tela de Acessos no MVP; demais ajustes ficam incrementais.
- **Risco de dependência externa**: `ecad-authz` precisa aceitar registro idempotente das novas permissões (inclusive no novo domínio `acessos`). **Mitigação**: já validado pelo script `seed-authz.sh` para outros domínios. Mudanças são aditivas; não há deprecação nesta entrega.
- **Risco de governança**: governança ECAD pode pedir mais nuance (ex.: dual-control). **Mitigação**: PRD documenta explicitamente que dual-control foi considerado e rejeitado para esta entrega, deixando porta aberta para PRD futuro.

---

## Alternativas Consideradas

### Abordagem Escolhida: Framework cross-cutting + showcase em Distribuição + Gestor de Acessos (faseado por domínio)

- **Descrição**: Esta entrega cobre os princípios cross-cutting (4 níveis com Gerente/Analista segregados, 5 categorias, naming, ciclo de vida), aplica integralmente em Distribuição como showcase, e introduz o perfil cross-domain `acessos.default.gestor`. Os outros 3 domínios viram PRDs próprios.
- **Por que foi escolhida**: equilibra rigor (framework formalizado), risco controlado (1 domínio por vez), e atende três necessidades explícitas do usuário: granularidade fina incluindo UI, segregação real entre operação sênior e governança via Gerente exclusivo de auditoria, e separação entre gestão de acessos e administração técnica de authz.

### Alternativa Rejeitada 1: Aprovador como nome em vez de Gerente

- **Descrição**: Versão inicial deste PRD usava "Aprovador" para o perfil de governança.
- **Trade-offs**: "Aprovador" é mais comum em literatura RBAC mas comunica apenas a função de aprovação. "Gerente" comunica governança + auditoria + responsabilidade pelo domínio.
- **Por que foi rejeitada**: a função inclui aprovar, finalizar, cancelar, ver auditoria e consultar assignments do domínio — escopo de gerente, não apenas de aprovador.

### Alternativa Rejeitada 2: Analista como superset literal (inclui auditoria)

- **Descrição**: Manter Analista como "tudo que existe no domínio", incluindo histórico de alterações.
- **Trade-offs**: simples de explicar ("Analista vê tudo") mas elimina segregação de funções: quem opera tem como auditar a si mesmo.
- **Por que foi rejeitada**: contraria o princípio de SoD que motivou parte da refatoração. Trilha de auditoria precisa ser de quem audita, não de quem opera.

### Alternativa Rejeitada 3: Aditivo + big bang nos 4 domínios

- **Descrição**: Adicionar Operador e Gerente para os 4 domínios de uma vez. Não tocar em UI granular nesta entrega.
- **Trade-offs**: rápido para alcançar consistência de catálogo, baixo risco operacional, porém perde a oportunidade de explorar granularidade fina (UI components + histórico de alterações) que era o ponto motivador.
- **Por que foi rejeitada**: o usuário quer construir o modelo "discutindo domínio a domínio para criar exemplos bem granulares incluindo permissões de UI". Big bang não comporta essa discussão por domínio.

### Alternativa Rejeitada 4: Refatoração + migração explícita (rename Analista → Senior)

- **Descrição**: Renomear `*.default.analista` para `*.default.senior` e criar Operador + Gerente.
- **Trade-offs**: comunica melhor a semântica mas exige migração de usuários reais e atualização de hardcodes.
- **Por que foi rejeitada**: manter `analista` preserva trabalho já feito, atende a meta de zero usuário perdendo acesso, e a semântica pode ser melhorada via `description` sem renaming.

### Alternativa Rejeitada 5: Dual-control (aprovação por dois perfis simultâneos)

- **Descrição**: Algumas ações (finalizar, cancelar) exigem dois usuários distintos clicando em sequência.
- **Trade-offs**: governança mais robusta; porém requer mudanças no backend de Distribuição (modelo de approval pendente), no contrato de evento, e na UI.
- **Por que foi rejeitada**: complexidade desproporcional para a PoC. Fica registrado como possível evolução futura.

### Alternativa Rejeitada 6: Gestor de Acessos como subconjunto do super-admin de authz

- **Descrição**: Não criar domínio `acessos` separado; apenas dividir o `authz:admin:*` em vários permission subkeys.
- **Trade-offs**: reusa namespace existente, evita criar novo domínio; porém mistura governança de pessoas com administração técnica de catálogo.
- **Por que foi rejeitada**: usuário quer um eixo separado e claramente identificável; misturar com `authz:admin:*` perpetua a falta de segregação.

---

## Decisões Tomadas Durante Revisão (2026-05-25)

As questões em aberto da primeira versão foram resolvidas:

| # | Questão | Decisão |
|---|---|---|
| Q1 | Usuários de teste e mapping de produção | Usuários de teste sugeridos (lista em Plano de Rollout MVP); usuário cria-os no Logto IdP e atribui via Gestor de Acessos. **Mapeamento de usuários reais em produção (`tsgomes`, `t3crjdamuir4`, etc.) permanece em aberto** — fica como item de governança, não bloqueia a entrega técnica. |
| Q2 | Backend de auditoria existe? | **Sim, existe.** `ecad-auditoria` (`/home/tsgomes/github-tassosgomes/ecad-auditoria/`) é serviço autônomo Java + Oracle com SDK Spring Boot starter. Distribuição já produz eventos via `ProcessoAuditEventFactory`. A trilha exposta ao Gerente consome `GET /entities/Processo/{id}/timeline` do serviço de auditoria. Sem trabalho de implementação de serviço; apenas integração consumidora. |
| Q3 | F05 (liberação de retidos) bloqueia? | **Não bloqueia.** PRD pronto em `tasks/distribuicao/prd-liberacao-creditos-retidos/` (prd.md + techspec.md), status `done` no Domain Doc. Permissão `credito-retido:liberar-manual` pode ser definida no catálogo built-in. |
| Q4 | Demonstrativo (F07) no MVP? | **Sim.** Permissões `demonstrativo:visualizar` e `demonstrativo:exportar` ficam documentadas e seedadas; ficam sem uso até F07 sair do `planned`. Considerar Should Have em vez de Must Have. |
| Q5 | CPF: backend ou frontend mascara? | **Backend.** Confirmado: `TitularResponse` em Cadastro hoje retorna CPF completo sempre. Esta entrega adiciona `cadastro:default:titular:ver-cpf-completo` ao catálogo de Cadastro e exige mudança no `TitularResponse` para mascarar quando a permissão não está presente no JWT do caller. A permissão é incluída no perfil `distribuicao.default.analista` (e, no Phase 3, no `cadastro.default.analista`). Frontend gating é redundante mas mantido para UX. |
| Q6 | Query escopada (RF-05): BFF ou ecad-authz? | **A definir na TechSpec.** Recomendação a explorar: BFF aplica filtro derivado dos perfis Gerente do caller; `ecad-authz` mantém endpoint genérico. Não bloqueia o PRD. |
| Q7 | Trilha de alteração tem diff? | **Sim.** O contrato V1 do `ecad-auditoria` (`audit-event-v1.schema.json`) define schema condicional para `DATA_CHANGE` que inclui payload de diff. UI pode renderizar before/after por campo alterado. |
| Q8 | Criar `acessos.default.consultor`? | **Sim.** Incluído em RF-04 como perfil de auditoria/compliance read-only. |
| Q9 | Produzir ADR 0006 nesta entrega? | **Sim.** RF-08 mantém ADR como entregável da Fase 2 deste PRD. |

## Questões em Aberto (remanescentes)

- **Mapeamento de usuários reais de produção** (`tsgomes`, `t3crjdamuir4`, demais) para os novos perfis. *(Responsável: governança ECAD; impacto: perfis ficam vazios em prod até a decisão acontecer. Prazo: antes do go-live da Fase 2; pode ser feito incrementalmente pelo Gestor de Acessos.)*
- **Localização da lógica de filtro escopado (BFF vs `ecad-authz` SDK)** — decisão técnica de implementação a ser fechada na TechSpec.
- **Padrão de permission propagation do JWT para chamadas Cadastro ↔ Distribuição** — quando Distribuição chama Cadastro como ACL para obter Titular, propaga o JWT do usuário ou usa service token? Define se o mascaramento de CPF preserva a identidade do chamador. Decisão na TechSpec.

---

*PRD gerado com a skill `flow-prd-creator` em modo Pipeline (Vision Doc + Domain Doc de Distribuição consumidos). Para gerar a Especificação Técnica deste PRD, use a skill `flow-techspec-creator`. A TechSpec é onde decisões arquiteturais (incluindo o ADR 0006) serão tomadas.*
