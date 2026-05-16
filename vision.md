# Vision Document — mini-ECAD (mcad)

> **Nível 0 da hierarquia de documentação.** Este documento é a âncora de contexto para todos os Domain Docs, PRDs, Tech Specs e Tasks do projeto. Sempre que iniciar uma nova sessão com a IA, forneça este arquivo como contexto.

---

## 1. Visão Geral do Sistema (System Overview)

### Problema de Negócio

O ECAD está construindo sua fundação de plataforma — bibliotecas compartilhadas, infraestrutura Kubernetes, padrões de observabilidade e identidade. Para que os times de desenvolvimento adotem esses padrões de forma consistente, é necessária uma **aplicação de referência** que demonstre como tudo se conecta usando o domínio real do negócio.

Os exemplos genéricos disponíveis (e-commerce, pedidos/estoque) não ressoam com o time porque o domínio de gestão coletiva de direitos autorais é muito diferente desses cenários. Sem uma referência concreta, os times criam atalhos que violam o isolamento entre contextos, misturam fronteiras de responsabilidade e perpetuam conhecimento tácito sobre regras de negócio complexas como o cálculo de distribuição.

### Solução Proposta

O mini-ECAD (mcad) é uma aplicação de demonstração multi-contexto que usa o **domínio real** do ECAD — obras, fonogramas, titulares, execuções, verbas e créditos — para materializar os padrões arquiteturais da plataforma. O sistema implementa os quatro domínios centrais do processo de distribuição de direitos autorais com regras de negócio simplificadas mas fiéis ao Regulamento de Distribuição, servindo como **living documentation** e referência arquitetural para o time de desenvolvimento.

### Público-Alvo (Target Audience)

| Perfil (Role) | Descrição | Necessidade Principal |
|---|---|---|
| Arquiteto de Software | Responsável pelos padrões da plataforma ECAD | Referência concreta de como aplicar Schema-per-Service, CQRS, Event-Driven e API Composition no domínio real |
| Desenvolvedor Backend | Engenheiro dos times de produto | Exemplo funcional de como construir microsserviços isolados com a linguagem ubíqua do ECAD |
| Desenvolvedor Frontend | Engenheiro de interfaces | Referência de como consumir APIs compostas (BFF) e exibir dados de múltiplos contextos |
| Tech Lead | Líder técnico de squad | Base para decisões de design e onboarding de novos membros do time |

### Contexto de Entrada

- [x] Discovery com cliente
- [ ] Modernização de sistema legado
- [ ] Ideia nova (greenfield)

> **Nota:** Embora o mcad parta do zero (sem código legado), o domínio de negócio é baseado no sistema real do ECAD. As regras foram simplificadas para fins de demonstração, mas a linguagem ubíqua e as fronteiras de contexto refletem o negócio real.

---

## 2. Domínios Identificados (Domain Map)

> Um domínio é um conjunto coeso de responsabilidades de negócio com fronteiras bem definidas (bounded context).

| # | Domínio (Domain) | Responsabilidade Principal | Status | Domain Doc |
|---|---|---|---|---|
| D01 | Cadastro | Fonte de verdade de Obras Musicais, Fonogramas e Titulares. Valida percentuais de titularidade autoral (soma = 100%) e conexa, controla ciclo de vida de status (LIBERADO/BLOQUEADO/PENDENTE) e publica eventos de mudança. | `done` | `domains/cadastro/domain.md` |
| D02 | Identificação | Recebe execuções musicais de diversas origens (planilhas, plataformas de streaming, gravações), identifica obras e fonogramas via ISRC/ISWC, atribui tipo de utilização com peso correspondente e fecha o Rol de Execuções do período. | `done` | `domains/identificacao/domain.md` |
| D03 | Arrecadação | Registra usuários de música licenciados, controla pagamentos de licença por rubrica e período, calcula verba líquida (dedução administrativa de 15% sobre o bruto), publica verba disponível e processa estornos. | `done` | `domains/arrecadacao/domain.md` |
| D04 | Distribuição | Cruza verba líquida da Arrecadação com Rol de Execuções da Identificação e calcula créditos por titular aplicando split autoral (66,67%) / conexo (33,33%). Retenções, ajustes e demonstrativos permanecem planejados. | `in-progress` | `domains/distribuicao/domain.md` |

**Cross-cutting (não são domínios de negócio):**
- **Plataforma** — BFF/API Composition, Frontend React/Vite, Analytics Consumer (CQRS Read Model), DW Sync (ClickHouse), Dashboards Metabase

**Status possíveis:** `planned` · `in-progress` · `done` · `out-of-scope`

### Status por feature (PRD) — snapshot 2026-05-16

| Domínio | PRD | Status |
|---|---|---|
| D01 Cadastro | seed-associacoes, gestao-titulares, gestao-obras, titularidades-autorais, gestao-fonogramas, participacao-conexa, controle-status, campo-codigo, autenticacao | `done` |
| D01 Cadastro | eventos-cadastro (Outbox + CloudEvents) | `done` |
| D01 Cadastro | ownership-snapshot para Distribuição | `done` |
| D02 Identificação | gestao-captacoes | `done` |
| D02 Identificação | registro-manual-execucoes | `done` |
| D02 Identificação | upload-csv-execucoes (MinIO + worker + telas alinhadas ao DESIGN.md) | `done` |
| D02 Identificação | identificacao-execucoes (pendentes + worker de re-verificação) | `done` |
| D02 Identificação | fechamento-rol (validação + Outbox `identificacao.rol.fechado`) | `done` |
| D02 Identificação | cancelamento-recriacao (3 opções + consumer `distribuicao.rol.processado`) | `done` |
| D03 Arrecadação | seed-rubricas | `done` |
| D03 Arrecadação | registro-pagamentos (QA validado) | `done` |
| D03 Arrecadação | gestao-usuarios-musica, gestao-licencas | `done` (backend + frontend + rotas + sidebar implementados; tasks 100% concluídas) |
| D03 Arrecadação | calculo-verba-liquida | `done` (10/10 tasks; qa_report; migration V13, VerbaService + handlers + recálculo + Outbox) |
| D03 Arrecadação | estorno-pagamento | `done` (backend + frontend; migration V10, endpoint `POST /pagamentos/{id}/estornar`, VerbaEstornoFlowIT/VerbaLockIT) |
| D04 Distribuição | sync-rubricas (consumer + snapshot) | `done` (implementado; testes de integração seguem bloqueados por dívida de Testcontainers/Docker) |
| D04 Distribuição | gestao-processos | `done` (backend + frontend completos; `@RequiresPermission` em todos os endpoints e auditoria via `AuditClient` em todos os handlers de comando; 95 unit tests verdes; 10 IT bloqueados por dívida pré-existente de Testcontainers 1.19.8 / Docker engine 1.44+ — escopo separado) |
| D04 Distribuição | calculo-creditos | `done` (cálculo ponderado por quantidade/peso, split autoral/conexo, persistência de créditos e evento `distribuicao.processo.calculado`; sem retenção, ajuste ou demonstrativo) |
| D04 Distribuição | retencao-creditos, liberacao-retidos, ajustes-estorno, demonstrativo-creditos | `planned` |

> Fonte: auditoria cruzando `tasks/**/prd-*` e código em `services/{cadastro,identificacao,arrecadacao,distribuicao}-api/`.

### Lacunas de integração conhecidas — snapshot 2026-05-16

- **Contrato de período:** Identificação publica `identificacao.rol.fechado` com `periodo` no formato `YYYY-MM-DD`, enquanto Arrecadação e Distribuição operam com período mensal `YYYY-MM`. O fluxo Rol + Verba só fica confiável quando o contrato for normalizado.
- **Confirmação de Rol processado:** Distribuição publica `distribuicao.rol.processado`, mas o payload atual usa o id do snapshot de Rol como `captacaoId`; Identificação espera o id original da captação para bloquear cancelamento.
- **Lock da Verba:** Arrecadação já consome `distribuicao.processo.iniciado` e `distribuicao.processo.finalizado` para bloquear/liberar verba, mas Distribuição ainda não publica `distribuicao.processo.iniciado`. O bloqueio no início do processo ainda é latente.
- **Snapshots em Distribuição:** eventos novos de Rol e Verba são persistidos, mas reenvios/atualizações de snapshots existentes ainda são tratados como no-op/log.
- **Estornos e retenções:** Arrecadação publica estorno; Distribuição ainda não consome `arrecadacao.pagamento.estornado`. Retenção/liberação de créditos e demonstrativos ainda não foram implementados.
- **Status de Cadastro na Identificação:** o fluxo automático valida status `LIBERADO`, mas o handler de registro manual compara `LIBERADA`; isso pode gerar pendências indevidas até a correção.

---

## 3. Mapa de Interdependências (Dependency Map)

> Quais domínios dependem de quais. Use para identificar a ordem de desenvolvimento e riscos de acoplamento.

```
Identificação ──depende de──→ Cadastro (consulta obras/fonogramas para identificar execuções)
Distribuição  ──depende de──→ Cadastro (consulta titularidades para calcular créditos)
Distribuição  ──depende de──→ Identificação (consome Rol de Execuções fechado via evento)
Distribuição  ──depende de──→ Arrecadação (consome Verba Líquida disponível via evento)
Arrecadação   ──consome feedback de──→ Distribuição (lock operacional de verba)
Analytics     ──consome de──→ Todos os domínios (eventos de todos os contextos)
```

| Domínio Origem | Depende de | Tipo de Dependência | Risco |
|---|---|---|---|
| Identificação | Cadastro | Consulta HTTP — ACL para validar obra_id/fonograma_id | Baixo — interface estável |
| Distribuição | Cadastro | Consulta HTTP — obter titularidades de obras e fonogramas | Médio — modelo de titularidade é complexo |
| Distribuição | Identificação | Evento `identificacao.rol.fechado` — Rol do período | Médio — formato do evento precisa ser acordado |
| Distribuição | Arrecadação | Evento `arrecadacao.verba.disponivel` — Verba líquida | Baixo — estrutura simples |
| Arrecadação | Distribuição | Eventos `distribuicao.processo.iniciado` / `distribuicao.processo.finalizado` — lock operacional de verba | Médio — início ainda não é publicado por D04 |
| Analytics | Todos | Eventos de todos os domínios (consumidor passivo) | Baixo — read-only, sem impacto nos domínios |

**Nota:** Cadastro é totalmente independente. Identificação depende do Cadastro para resolver obras/fonogramas. Arrecadação é independente no fluxo principal e consome apenas feedback operacional da Distribuição para lock de verba. Distribuição é o orquestrador que consome os três domínios anteriores.

---

## 4. Roadmap Macro (High-Level Roadmap)

> Fases de entrega do sistema inteiro. Cada fase deve ser entregável e testável de forma independente.

### Fase 1 — Fundação + Cadastro (MVP)
**Objetivo:** Estabelecer a infraestrutura base e implementar o domínio mais independente e fundamental do sistema — o Cadastro de obras, fonogramas e titulares com regras de negócio reais.
**Domínios incluídos:** D01 (Cadastro) + Infraestrutura (Docker Compose, schemas PostgreSQL, RabbitMQ, estrutura de projetos)
**Critério de conclusão:** Conseguir cadastrar uma obra musical completa com titulares autorais e conexos, fonograma com ISRC, validação automática de percentuais (soma = 100%), controle de status e publicação de eventos no RabbitMQ.

### Fase 2 — Identificação + Arrecadação
**Objetivo:** Completar os dois domínios que alimentam a Distribuição — a capacidade de identificar execuções musicais e a gestão de verbas arrecadadas.
**Domínios incluídos:** D02 (Identificação), D03 (Arrecadação)
**Critério de conclusão:** Conseguir fazer upload de execuções, identificá-las automaticamente por ISRC, atribuir pesos por tipo de utilização, fechar o Rol do período; e em paralelo, registrar pagamentos de licença, calcular verba líquida e publicar evento de verba disponível.

### Fase 3 — Distribuição
**Objetivo:** Implementar o domínio central — o algoritmo de cálculo que cruza execuções identificadas com verba líquida e distribui créditos aos titulares conforme o Regulamento.
**Domínios incluídos:** D04 (Distribuição)
**Critério de conclusão:** Executar um processo completo de distribuição para uma rubrica/período, gerando créditos corretos para titulares autorais e conexos, com split 66,67%/33,33%, pesos por tipo de utilização, retenção de créditos pendentes e demonstrativo por titular.

### Fase 4 — Analytics & BI
**Objetivo:** Consolidar dados de todos os domínios em visões analíticas cross-domain que demonstrem o padrão CQRS + Data Warehouse sem violar o isolamento entre schemas.
**Domínios incluídos:** Cross-cutting (Analytics Consumer, DW Sync, Dashboards)
**Critério de conclusão:** Visualizar no Metabase relatórios de "Top fonogramas mais executados" e "Execuções por titular" sem nenhum JOIN cross-schema, alimentados exclusivamente por eventos.

---

## 5. Restrições Globais (Global Constraints)

> Restrições que se aplicam a **todo** o sistema, não a um domínio específico.

### Restrições Técnicas (Technical Constraints)
- **Stack de APIs:** .NET 8 Minimal API e Java (coexistência proposital para demonstrar interoperabilidade)
- **Frontend:** React com Vite (SPA)
- **Banco OLTP:** PostgreSQL 16 — Schema-per-Service com grants isolados por contexto
- **Banco OLAP:** ClickHouse — colunar, para queries analíticas
- **Mensageria:** RabbitMQ — broker AMQP para integração entre contextos via eventos
- **BI/Dashboards:** Metabase
- **Orquestração local:** Docker Compose — zero infraestrutura para rodar o demo
- **Integrações obrigatórias:** Nenhuma externa — sistema auto-contido
- **Autenticação:** Keycloak externo (já existente) como IDP centralizado. Frontend via Authorization Code + PKCE com `oidc-client-ts`. Backend valida JWT via JWKS. Detalhes em `docs/architecture/auth-plan.md`

### Restrições de Negócio (Business Constraints)
- **Prazo:** Sem prazo fixo — milestones definidos por fase do roadmap
- **Stakeholders:** Apenas time interno (arquitetura e engenharia de plataforma)
- **Regulatório:** Regras baseadas no Regulamento de Distribuição do ECAD, mas simplificadas para fins de demonstração
- **Dados:** Sem migração de dados reais — dados de demonstração serão criados manualmente ou via seed

### Simplificações em Relação ao Sistema Real
- Uma rubrica por vez (sem múltiplas rubricas paralelas no mesmo processo de distribuição)
- Sem amostragem estatística — todas as execuções são identificadas diretamente
- Sem integração com associações externas (ABRAMUS, UBC, etc.)
- Sem mTLS ou service mesh entre serviços; chamadas serviço-serviço usam ACLs HTTP/eventos e, em alguns fluxos, propagação de token de usuário/serviço
- Domínio Público por configuração manual, não por cálculo de datas reais (70 anos)
- Sem rol retroativo (execuções de períodos anteriores)

### Non-Goals do Sistema
- **Não substituirá o sistema de produção do ECAD** — é exclusivamente uma aplicação de referência
- **Não cobrirá 100% das rubricas e regras do Regulamento** — apenas o suficiente para demonstrar os padrões
- **Não atingirá escala de produção** — não precisa processar bilhões de execuções/ano
- **Não incluirá app mobile**
- **Não implementará ABAC granular por associação/tenant** (ex: Analista X só edita titulares da sua associação). A codebase já implementa autorização por roles/permissões de domínio em APIs e BFF.
- **Não terá integração com sistemas externos** — é auto-contido
- **Não gerará pagamentos reais** — o ciclo termina no demonstrativo de créditos

---

## 6. Glossário de Negócio (Business Glossary)

> Termos do domínio de negócio com definição acordada. Essencial para manter consistência entre domínios e sessões com a IA.

| Termo | Definição | Domínio(s) |
|---|---|---|
| Obra Musical | Composição protegida por direito autoral. Pode ser instrumental (MUSICAL), com letra (LITEROMUSICAL), versão traduzida (VERSAO) ou medley (POT_POURRI) | Cadastro |
| Fonograma | Gravação específica de uma obra musical. Identificado internacionalmente pelo código ISRC | Cadastro |
| Titular Autoral | Criador da obra: Autor/Compositor, Editor, Subeditor ou Versionista | Cadastro |
| Titular Conexo | Participante da gravação: Intérprete, Produtor Fonográfico ou Músico Executante | Cadastro |
| Titularidade | Participação percentual de um titular em uma obra (soma obrigatória: 100% para autorais) | Cadastro |
| ISRC | International Standard Recording Code — código de 12 caracteres que identifica um fonograma | Cadastro, Identificação |
| ISWC | International Standard Musical Work Code — código que identifica uma obra musical | Cadastro, Identificação |
| CAE/IPI | Código internacional de identificação de titular de direitos autorais | Cadastro |
| Associação | Entidade de gestão coletiva filiada ao ECAD (ex: ABRAMUS, UBC, SBACEM) que representa titulares | Cadastro |
| Captação | Processo de recebimento de execuções musicais de um usuário de música em um período | Identificação |
| Execução | Registro de uma música tocada/executada em um meio específico (rádio, TV, show, streaming) | Identificação |
| Tipo de Utilização | Classificação do uso da música: TA (tema de abertura), BK (background), PE (performance cênica), etc. Cada tipo tem um peso associado | Identificação |
| Rol de Execuções | Lista finalizada de obras/fonogramas identificados em um período/rubrica, pronta para distribuição | Identificação |
| Rubrica | Segmento de utilização musical: Rádio AM/FM, TV Aberta, TV Fechada, Streaming, Show, Cinema | Arrecadação, Identificação |
| Usuário de Música | Empresa ou pessoa que utiliza música publicamente e paga licença ao ECAD (ex: rádio, casa de shows) | Arrecadação |
| Licença | Autorização paga pelo usuário de música para utilizar repertório musical em determinada rubrica/período | Arrecadação |
| Verba Líquida | Valor arrecadado após dedução dos percentuais administrativos (85% do valor bruto — 10% ECAD + 5% associações) | Arrecadação |
| Processo de Distribuição | Operação que cruza verba líquida + rol de execuções de um período/rubrica para calcular créditos | Distribuição |
| Parte Autoral | 66,67% da verba de uma obra — distribuída entre compositores e editores conforme percentuais de titularidade | Distribuição |
| Parte Conexa | 33,33% da verba de uma obra com fonograma — distribuída entre intérpretes (41,7%), produtores (41,7%) e músicos (16,6%) | Distribuição |
| Crédito | Valor calculado e atribuído a um titular específico em um processo de distribuição | Distribuição |
| Crédito Retido | Crédito bloqueado por pendência cadastral (obra PENDENTE/BLOQUEADA, titular sem associação). Retido por até 5 anos antes de prescrever | Distribuição |
| Domínio Público | Obra cujo prazo de proteção patrimonial expirou (70 anos após morte do último autor). Não gera créditos | Cadastro |

---

## 7. Premissas e Riscos Globais (Assumptions & Risks)

### Premissas (Assumptions)
- O projeto parte do zero, sem código ou infraestrutura existente
- O ambiente de execução será exclusivamente local via Docker Compose
- O time de desenvolvimento tem familiaridade com .NET, Java e React
- A linguagem ubíqua do ECAD (termos do Regulamento de Distribuição) será utilizada em todo o código e documentação
- As regras de negócio simplificadas serão definidas com clareza no Domain Doc de cada domínio antes da implementação
- Haverá disponibilidade de conhecimento de negócio para validar as regras implementadas

### Riscos Globais (Global Risks)

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Complexidade do algoritmo de Distribuição subestimada — regras de split, pesos e retenção são intrinsecamente complexas | Média | Alto | Definir escopo exato das regras no Domain Doc antes de implementar; começar com cenário mais simples (uma obra, um titular) e expandir |
| Fronteira entre "simplificado" e "real" mal definida — risco de scope creep ao tentar implementar regras adicionais | Média | Alto | Vision Doc e Domain Docs como contratos de escopo; cada simplificação explicitamente documentada |
| Coexistência de .NET e Java na mesma PoC pode gerar overhead de manutenção | Baixa | Médio | Definir claramente quais contextos usam qual stack; garantir que a interoperabilidade via eventos/HTTP seja o ponto de integração |
| Isolamento de schemas (Schema-per-Service) pode ser violado por atalhos durante desenvolvimento | Média | Médio | Scripts de validação automatizados que verificam grants e ausência de cross-schema queries |

---

## 8. Histórico de Revisões (Revision History)

| Versão | Data | Autor | Alterações |
|---|---|---|---|
| 1.0 | 2026-03-29 | Discovery com IA | Versão inicial — 4 domínios identificados, roadmap em 4 fases, restrições e glossário definidos |
| 1.1 | 2026-03-30 | Decisão arquitetural | Auth adicionada: Keycloak externo, JWT, OIDC PKCE. Removido non-goal de "sem autenticação". Plano em `docs/architecture/auth-plan.md` |
| 1.2 | 2026-04-01 | Fase 1 concluída | Domínio Cadastro (D01) 100% implementado: 8 features (F01-F08), 8 tabelas, 8 eventos CloudEvents, Outbox Pattern. Auth em finalização. |
| 1.3 | 2026-05-10 | Auditoria de implementação | Status atualizado por evidência de código: D02/D03/D04 promovidos para `in-progress`. D02: gestao-captacoes e registro-manual-execucoes concluídos. D03: seed-rubricas e registro-pagamentos concluídos (QA validado). D04: sync-rubricas em progresso, scaffold de domínio (Processo/Credito/Snapshots) presente. Adicionado snapshot de status por PRD na Seção 2. |
| 1.4 | 2026-05-10 | Conclusão do D02 | Backend de F06 (cancelamento-recriacao) implementado — `Captacao.Cancelar/MarcarDistribuicaoProcessada`, migration `AddCancelamentoFields`, `DistribuicaoEventConsumer` (primeiro consumer RabbitMQ do serviço), `CancelarRolCommand/PodeCancelarQuery` com 3 opções de recriação, endpoints e auditoria. F04 e F05 já estavam implementados — vision sincronizado: D02 promovido para `done`, três features (`identificacao-execucoes`, `fechamento-rol`, `cancelamento-recriacao`) movidas de `planned` para `done`. |
| 1.5 | 2026-05-11 | Sincronização do D03 | Auditoria confirmou que `gestao-usuarios-musica` e `gestao-licencas` estão 100% implementados (backend Java + frontend React + rotas + sidebar; tasks 11/11 com `[x]`). Vision estava desatualizado — features promovidas de `in-progress` para `done`. `estorno-pagamento` já possui PRD/techspec/tasks (5 tasks), mas implementação ainda pendente — classificação mantida em `planned`. Próximo bloqueio no D03 é `calculo-verba-liquida`, que possui apenas PRD (techspec e tasks a gerar). |
| 1.6 | 2026-05-15 | Sincronização tardia D03 | Auditoria de filesystem revelou que `calculo-verba-liquida` (10/10 tasks `[x]`, migration V13, qa_report) e `estorno-pagamento` (backend completo: migration V10, `EstornarPagamentoCommand/Handler`, `VerbaEmDistribuicaoException`, endpoint `POST /pagamentos/{id}/estornar`, `VerbaEstornoFlowIT`+`VerbaLockIT`; frontend completo: types/api/hook/`EstornarPagamentoModal`/extensão `PagamentoDetailPage`) já estavam **integralmente implementados**, contradizendo classificação `planned` da revisão 1.5. Vision sincronizado — ambas features promovidas para `done`. D03 agora completo exceto por features ainda não planejadas. |
| 1.7 | 2026-05-16 | Entrega de F02 (D04) gestao-processos | PRD revisado e implementado fim a fim alinhado ao novo padrão consolidado pela migração authz (encerrada em 2026-05-15): **permissionamento** via `authz-spring-boot-starter` com `@RequiresPermission("distribuicao:default:processo:<acao>")` em 4 segmentos (ADR 0002/0003), `permissions.yaml` com 9 keys e catálogo em `docs/authz/catalog/distribuicao.md`; migração legacy de `RubricaController` e `ProcessoCalculoController` (`@PreAuthorize` removido). **Auditoria** obrigatória via `audit-sdk` — `ProcessoAuditEventFactory` produz `userAction` + `dataChange` para cada operação (CREATE/CALCULATE/APPROVE/FINALIZE/CANCEL) na mesma transação do comando. Backend: 5 commands + 3 queries + `ProcessoController` (8 endpoints), Outbox de domínio, event consumers Rol/Verba. Frontend: módulo `features/distribuicao/processos` completo com gate de UI por permission via BFF (ADR 0004). 95 unit tests verdes; 10 integration tests bloqueados por dívida pré-existente de infra (Testcontainers 1.19.8 incompatível com Docker engine 1.44+ — afeta também IT legados do mesmo módulo). Próximo bloqueio em D04 é fechar a task 6.0 de `sync-rubricas` (mesma dívida de Testcontainers) ou avançar para o núcleo da Fase 3 (cálculo de créditos / split / retenção / demonstrativo — ainda sem PRD). |
| 1.8 | 2026-05-16 | Auditoria de coerência codebase/docs | Documentação alinhada ao estado real da codebase: D01, D02 e D03 marcados como `done`; D04 mantido `in-progress` com F01/F02/F03 implementadas e retenção/liberação/ajustes/demonstrativos planejados. Registradas lacunas de contrato entre eventos, período, lock de verba e payload de `distribuicao.rol.processado`. |

---

*Vision Doc gerado com a skill `flow-vision-creator`. Para detalhar cada domínio, use a skill `flow-domain-creator`.*
