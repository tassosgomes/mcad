# Domain Document — Arrecadação

> **Nível 1 da hierarquia de documentação.** Este documento detalha o bounded context do domínio Arrecadação. Sempre forneça o `vision.md` junto com este arquivo ao iniciar sessões de PRD ou Tech Spec dentro deste domínio.

**Domínio:** Arrecadação
**Responsável:** a definir
**Status:** `done`
**Fase do Roadmap:** Fase 2 — Identificação + Arrecadação
**Última revisão:** 2026-05-16

---

## 1. Propósito do Domínio (Domain Purpose)

### Responsabilidade Principal
Registrar usuários de música licenciados, controlar pagamentos de licença por rubrica e período mensal, calcular verba líquida (85% do bruto) e disponibilizá-la incrementalmente para o processo de Distribuição. A codebase também mantém UDA como valor de referência/histórico para o registro de pagamentos.

### Problema que Resolve
Sem um registro estruturado de arrecadação, a Distribuição não sabe quanto dinheiro existe para distribuir por rubrica e período. O domínio de Arrecadação transforma pagamentos individuais de licenciados em verba líquida calculada e rastreável, pronta para ser cruzada com o Rol de Execuções no processo de distribuição de créditos.

### Fora do Escopo deste Domínio (Out of Scope)
- Cálculo de enquadramento via UDA (fórmula de coeficiente de atividade, fator de porte, redutor regional) → simplificado: UDA é valor de referência; o pagamento é registrado pelo Analista a partir da quantidade de UDAs/valor calculado
- Distinção entre Usuário Permanente (mensalista) e Usuário Eventual (eventos) → simplificado: apenas "Licença" genérica
- Multas, juros e inadimplência → fora da PoC
- Guia de Recolhimento → fora da PoC (apenas registro de pagamento)
- Fiscalização de campo e agentes de arrecadação → fora da PoC
- Identificação de execuções musicais → domínio Identificação (D02)
- Cálculo de créditos e split autoral/conexo → domínio Distribuição (D04)
- Cadastro de obras, fonogramas e titulares → domínio Cadastro (D01)

---

## 2. Usuários do Domínio (Domain Users)

| Perfil (Role) | O que faz neste domínio | Frequência de uso |
|---|---|---|
| Analista de Arrecadação | Cadastra usuários de música, gerencia licenças, registra pagamentos, acompanha verba líquida por rubrica/período e realiza estornos. | Diária |
| Consultor de Arrecadação | Consulta usuários, licenças, pagamentos e verbas. Acesso somente leitura. | Eventual |

---

## 3. Entidades Principais (Core Entities)

> Entidades são os objetos de negócio centrais deste domínio. Não é um schema de banco de dados — é o vocabulário do domínio.

| Entidade | Descrição | Atributos Principais | Relacionamentos |
|---|---|---|---|
| Rubrica | Segmento de utilização musical que determina como a receita é categorizada. Fonte de verdade para todo o sistema — Identificação e Distribuição mantêm cópias locais sincronizadas via eventos. | sigla, nome, exige classificação (boolean) | usada por: Licença, Verba |
| Usuário de Música | Empresa ou pessoa que utiliza música publicamente e paga licença ao ECAD para ter autorização de uso do repertório musical. | CNPJ (alfanumérico), razão social, nome fantasia, endereço, contato, status (ATIVO/INATIVO) | possui: Licenças |
| Licença | Autorização que vincula um Usuário de Música a uma Rubrica com vigência definida. Criada diretamente como ATIVA (sem fluxo de aprovação). Representa o contrato de uso do repertório musical em um segmento específico. | data início, data fim, status (ATIVA/SUSPENSA/ENCERRADA) | vincula: Usuário de Música ↔ Rubrica; possui: Pagamentos |
| Pagamento | Registro financeiro de valor pago por um Usuário de Música contra uma Licença em um período mensal. Pode ser estornado com justificativa. | valor bruto, período (YYYY-MM), data de registro, status (CONFIRMADO/ESTORNADO), justificativa de estorno | pertence a: Licença |
| Verba | Agregação calculada por rubrica e período: soma dos pagamentos brutos confirmados, dedução de 15% (10% ECAD + 5% associações), resultado = verba líquida disponível para Distribuição. | rubrica, período (YYYY-MM), valor bruto total, dedução ECAD (10%), dedução associações (5%), verba líquida (85%) | calculada a partir de: Pagamentos confirmados da rubrica+período |

### Rubricas (seed fixo — 7 registros)

| Sigla | Nome | Exige Classificação |
|---|---|---|
| RADIO | Rádio AM/FM | Não |
| TV_ABERTA | TV Aberta | Sim |
| TV_FECHADA | TV Fechada | Sim |
| CINEMA | Cinema | Sim |
| VOD | Streaming Vídeo (VOD) | Sim |
| STREAMING_AUDIO | Streaming Áudio | Não |
| SHOW | Show | Não |

> **Nota:** Rubrica é fonte de verdade deste domínio. Identificação e Distribuição mantêm cópias locais sincronizadas via eventos `arrecadacao.rubrica.criada` e `arrecadacao.rubrica.atualizada` (event-driven ACL), evitando acoplamento runtime via HTTP. O campo "exige classificação" existe no modelo da Arrecadação mas é consumido apenas pela Identificação.

---

## 4. Features

| # | Feature | Descrição | Prioridade | Status | PRD |
|---|---|---|---|---|---|
| F01 | Seed de Rubricas | Carga inicial das 7 rubricas via migration. Publicação de eventos `arrecadacao.rubrica.criada` para sincronização com Identificação e Distribuição (event-driven ACL). Dados não editáveis pelo usuário. | Must Have | `done` | `tasks/arrecadacao/done-prd-seed-rubricas/prd.md` |
| F02 | Gestão de Usuários de Música | CRUD completo de usuários de música: razão social, nome fantasia, CNPJ alfanumérico, endereço, contato e status. Validação de unicidade por CNPJ. | Must Have | `done` | `tasks/arrecadacao/prd-gestao-usuarios-musica/prd.md` |
| F03 | Gestão de Licenças | Criar, consultar e encerrar licenças que vinculam um Usuário de Música a uma Rubrica com vigência. Um mesmo usuário pode ter licenças em múltiplas rubricas. | Must Have | `done` | `tasks/arrecadacao/prd-gestao-licencas/prd.md` |
| F04 | Registro de Pagamentos | Registrar pagamentos em UDAs contra uma licença ativa/suspensa no período atual. Gestão da UDA como entidade de referência com histórico. | Must Have | `done` | `tasks/arrecadacao/prd-registro-pagamentos/prd.md` |
| F05 | Cálculo e Disponibilização de Verba Líquida | Calcular verba líquida por rubrica+período (85% do bruto) e publicar evento `arrecadacao.verba.disponivel` incrementalmente. Lock durante distribuição. Tela de acompanhamento com visão detalhada e agregada. | Must Have | `done` | `tasks/arrecadacao/prd-calculo-verba-liquida/prd.md` |
| F06 | Estorno de Pagamento | Cancelar pagamento com justificativa obrigatória. Recalcula verba líquida da rubrica+período afetado e publica evento `arrecadacao.pagamento.estornado` para Distribuição considerar o estorno na próxima execução. | Must Have | `done` | `tasks/arrecadacao/prd-estorno-pagamento/prd.md` |

**Prioridades (MoSCoW):** `Must Have` · `Should Have` · `Could Have` · `Won't Have`
**Status possíveis:** `planned` · `prd-ready` · `in-progress` · `done` · `out-of-scope`

---

## 5. Dependências (Domain Dependencies)

### Depende de (Upstream)
| Domínio | O que consome | Tipo | Criticidade |
|---|---|---|---|
| Nenhum | — | — | — |

A Arrecadação é independente para seu fluxo principal. A codebase consome eventos de feedback da Distribuição apenas para bloquear/liberar verba durante o ciclo de distribuição.

### Consome como feedback operacional
| Domínio | O que consome | Tipo | Criticidade |
|---|---|---|---|
| Distribuição | Início/fim de processo para marcar verba como `EM_DISTRIBUICAO` ou `DISTRIBUIDA` | Evento assíncrono `distribuicao.processo.iniciado` / `distribuicao.processo.finalizado` | Média |

### Fornece para (Downstream)
| Domínio | O que fornece | Tipo | Criticidade |
|---|---|---|---|
| Distribuição | Verba líquida por rubrica+período para cálculo de créditos | Evento assíncrono `arrecadacao.verba.disponivel` | Alta |
| Distribuição | Notificação de estorno para ajuste na próxima distribuição | Evento assíncrono `arrecadacao.pagamento.estornado` | Alta |
| Identificação | Dados de rubricas (sigla, nome, exige classificação) para manter cópia local | Evento assíncrono `arrecadacao.rubrica.criada` / `arrecadacao.rubrica.atualizada` | Alta |
| Distribuição | Dados de rubricas para manter cópia local | Evento assíncrono `arrecadacao.rubrica.criada` / `arrecadacao.rubrica.atualizada` | Média |
| Analytics | Eventos de mudança de estado para alimentar read models | Evento assíncrono (RabbitMQ) | Média |

### Integrações Externas (External Integrations)
| Sistema Externo | Finalidade | Direção | Status |
|---|---|---|---|
| Nenhum | A Arrecadação é auto-contida nesta PoC | — | — |

---

## 6. Regras de Negócio (Business Rules)

| ID | Regra | Origem |
|---|---|---|
| RN-01 | Verba líquida = 85% do valor bruto arrecadado. Dedução: 10% ECAD + 5% associações | Regulamento de Distribuição |
| RN-02 | Período de arrecadação é mensal, representado como YYYY-MM | Simplificação para PoC |
| RN-03 | Um Usuário de Música pode ter licenças em múltiplas rubricas simultaneamente | Regra de negócio |
| RN-04 | Pagamento deve estar vinculado a uma licença com status ATIVA ou SUSPENSA. Licença ENCERRADA rejeita novo pagamento | Integridade de negócio |
| RN-05 | Estorno de pagamento publica evento `arrecadacao.pagamento.estornado`. Distribuição considera o estorno na próxima execução do processo de distribuição | Consistência entre domínios |
| RN-06 | Valores monetários usam tipos decimais de alta precisão (Decimal/Money). Nunca float/double | Requisito técnico de integridade |
| RN-07 | CNPJ é alfanumérico (novo formato brasileiro). Validação de unicidade por CNPJ | Regra cadastral |
| RN-08 | Rubrica é dado de referência (seed fixo de 7 registros), não editável pelo usuário. Alterações propagadas via eventos para domínios consumidores | Integridade de negócio |
| RN-09 | Evento `arrecadacao.verba.disponivel` é publicado incrementalmente — a cada pagamento confirmado, a verba líquida atualizada da rubrica+período é recalculada e disponibilizada | Decisão arquitetural |
| RN-10 | Não existe cálculo de enquadramento (coeficientes, redutores e regras de atividade). A UDA é mantida como valor de referência/histórico, e o pagamento é registrado a partir do valor informado/calculado pelo Analista | Simplificação para PoC |
| RN-11 | Não há distinção entre Usuário Permanente e Usuário Eventual. Licença é genérica | Simplificação para PoC |
| RN-12 | Licença é criada diretamente com status ATIVA (sem fluxo de aprovação). Pode ser suspensa ou encerrada pelo Analista | Simplificação para PoC |

---

## 7. Eventos do Domínio (Domain Events)

### Produz (Publishes)
- `arrecadacao.rubrica.criada` — rubrica inserida via seed. Identificação e Distribuição sincronizam cópia local. Contém: sigla, nome, exige classificação
- `arrecadacao.rubrica.atualizada` — rubrica alterada (caso futuro; listener consumidor existe em Distribuição, mas a Arrecadação ainda não tem fluxo de alteração de rubrica)
- `arrecadacao.usuario-musica.criado` — usuário de música criado. Identificação sincroniza projeção local. Contém: id, razaoSocial, nomeFantasia, cnpj, cnpjFormatado, status, timestamps
- `arrecadacao.usuario-musica.atualizado` — usuário de música atualizado/ativado/inativado. Mesmo payload completo (fat event)
- `arrecadacao.pagamento.registrado` — pagamento confirmado contra uma licença
- `arrecadacao.verba.disponivel` — verba líquida atualizada para rubrica+período. Publicado incrementalmente a cada pagamento confirmado. Contém: rubrica, período, valor bruto total, deduções, verba líquida calculada
- `arrecadacao.pagamento.estornado` — pagamento cancelado com justificativa. Distribuição deve considerar o estorno na próxima execução. Contém: rubrica, período, valor estornado, verba líquida recalculada

### Consome (Subscribes)
- `distribuicao.processo.iniciado` — marca a verba da rubrica+período como `EM_DISTRIBUICAO` para bloquear alterações durante o cálculo. A consumer já existe, mas depende de Distribuição publicar esse evento.
- `distribuicao.processo.finalizado` — marca a verba como `DISTRIBUIDA`.

Eventos de identidade também são consumidos como preocupação cross-cutting para manter a projeção local de usuários.

---

## 8. Estado da Codebase (2026-05-16)

- O escopo funcional de Arrecadação está implementado: rubricas seed, usuários de música, licenças, pagamentos com UDA, cálculo/recalculo de verba líquida, estorno, Outbox e frontend.
- Pagamentos confirmados recalculam a verba da rubrica+período e publicam `arrecadacao.verba.disponivel`; estornos recalculam a verba e publicam `arrecadacao.pagamento.estornado`.
- Há lock pessimista no recálculo de verba e validação para impedir alteração quando a verba está em distribuição.
- Lacuna conhecida: o bloqueio no início da distribuição depende de `distribuicao.processo.iniciado`, que ainda não é publicado por Distribuição. O evento `distribuicao.processo.finalizado` já é publicado.
- Lacuna conhecida: `arrecadacao.rubrica.atualizada` é contrato futuro; a implementação atual publica rubricas criadas via seed/outbox.

---

## 9. Estratégia de Desenvolvimento (Development Strategy)

### Ordem de Implementação Sugerida
1. **F01 — Seed de Rubricas** — base do domínio, pré-requisito para licenças e propagação por evento para Identificação/Distribuição
2. **F02 — Gestão de Usuários de Música** — entidade base, independente
3. **F03 — Gestão de Licenças** — depende de F01 + F02, vincula usuário a rubrica
4. **F04 — Registro de Pagamentos** — depende de F03, implementa RN-04
5. **F05 — Cálculo e Disponibilização de Verba Líquida** — depende de F04, implementa RN-01 e RN-09
6. **F06 — Estorno de Pagamento** — depende de F04 + F05, implementa RN-05

### Riscos do Domínio
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Migração do seed de Rubrica na Identificação (já implementada com seed próprio) para consumo via evento | Média | Médio | Implementar F01 primeiro; Identificação mantém seed como fallback até consumir evento `arrecadacao.rubrica.criada` |
| Verba incremental pode gerar inconsistências se Distribuição consumir durante janela de pagamentos | Média | Alto | Documentar no PRD que Distribuição deve usar snapshot da verba no momento do cálculo, não o valor em tempo real |
| Modelo simplificado (sem UDA) pode não demonstrar complexidade suficiente do domínio real | Baixa | Baixo | Aceitável para PoC; simplificações documentadas explicitamente nas RN-10 e RN-11 |

---

## 10. Questões em Aberto (Open Questions)

- [x] ~~Identificação já tem seed próprio de Rubricas — como sincronizar?~~ → Resolvido: Arrecadação publica eventos `arrecadacao.rubrica.criada`/`atualizada`. Identificação mantém cópia local sincronizada via event-driven ACL (sem acoplamento HTTP runtime)
- [x] ~~O campo "exige classificação" da Rubrica é relevante para Arrecadação?~~ → Resolvido: campo existe no modelo da Arrecadação (fonte de verdade) mas é consumido apenas pela Identificação
- [x] ~~Licença com fluxo de aprovação ou diretamente ATIVA?~~ → Resolvido: criada diretamente como ATIVA (RN-12)

Todas as questões foram resolvidas. Domain Doc sincronizado com a implementação atual.

---

*Domain Doc gerado com a skill `flow-domain-creator`. Para criar PRDs das features deste domínio, use a skill `flow-prd-creator` fornecendo o `vision.md` e este `domain.md` como contexto.*
