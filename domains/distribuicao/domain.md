# Domain Document — Distribuição

> **Nível 1 da hierarquia de documentação.** Este documento detalha o bounded context do domínio Distribuição. Sempre forneça o `vision.md` junto com este arquivo ao iniciar sessões de PRD ou Tech Spec dentro deste domínio.

**Domínio:** Distribuição
**Responsável:** a definir
**Status:** `planned`
**Fase do Roadmap:** Fase 3 — Distribuição
**Última revisão:** 2026-04-08

---

## 1. Propósito do Domínio (Domain Purpose)

### Responsabilidade Principal
Calcular e atribuir créditos aos titulares de direitos autorais e conexos, cruzando a verba líquida da Arrecadação com o Rol de Execuções da Identificação para uma rubrica e período, aplicando o split 66,67% autoral / 33,33% conexo, gerenciando retenções por pendências cadastrais e gerando demonstrativos de créditos por titular.

### Problema que Resolve
Sem um processo estruturado de distribuição, não há como transformar a verba arrecadada e as execuções identificadas em valores devidos a cada titular. A Distribuição é o domínio orquestrador que consome os três contextos anteriores (Cadastro, Identificação e Arrecadação) para executar o cálculo central do negócio — o rateio justo e rastreável de créditos conforme o Regulamento de Distribuição.

### Fora do Escopo deste Domínio (Out of Scope)
- Cálculo de dedução administrativa (15%) → já resolvido pela Arrecadação (verba líquida chega pronta)
- Cadastro e validação de obras, fonogramas e titulares → domínio Cadastro (D01)
- Identificação de execuções e fechamento do Rol → domínio Identificação (D02)
- Registro de pagamentos e cálculo de verba líquida → domínio Arrecadação (D03)
- Prescrição de créditos retidos (regra de 5 anos) → fora da PoC
- Múltiplas rubricas no mesmo processo de distribuição → fora da PoC (uma rubrica por vez)
- Pagamento efetivo aos titulares (transferência bancária, boleto) → fora da PoC (ciclo termina no demonstrativo)
- Redistribuição retroativa por decisão judicial ou recurso → fora da PoC
- Rol retroativo (execuções de períodos anteriores) → fora da PoC

---

## 2. Usuários do Domínio (Domain Users)

| Perfil (Role) | O que faz neste domínio | Frequência de uso |
|---|---|---|
| Analista de Distribuição | Cria processos de distribuição, executa o cálculo, revisa créditos calculados, aprova e finaliza o processo. Acompanha retenções e liberações. | Mensal (ciclo de distribuição por rubrica) |
| Consultor de Distribuição | Consulta processos, créditos e demonstrativos. Acesso somente leitura. | Eventual |
| Titular (via Demonstrativo) | Consulta seu demonstrativo de créditos — detalhamento de valores por obra, categoria e período. Acesso somente leitura ao próprio demonstrativo. | Mensal |

---

## 3. Entidades Principais (Core Entities)

> Entidades são os objetos de negócio centrais deste domínio. Não é um schema de banco de dados — é o vocabulário do domínio.

| Entidade | Descrição | Atributos Principais | Relacionamentos |
|---|---|---|---|
| Processo de Distribuição | Operação de cálculo que cruza verba líquida com Rol de Execuções para uma rubrica e período específicos. Iniciado manualmente pelo Analista. Transita por estados até a finalização. | rubrica, período (YYYY-MM), status (CRIADO/CALCULADO/APROVADO/FINALIZADO/CANCELADO), verba líquida utilizada, total de execuções processadas, data de criação, analista responsável | possui: Créditos; referencia: Rol (Identificação), Verba (Arrecadação) |
| Crédito | Valor calculado e atribuído a um titular específico dentro de um processo de distribuição. Detalhado por obra/fonograma, categoria e percentual aplicado. | titular_id, obra_id, fonograma_id (opcional), categoria (AUTORAL/CONEXO), subcategoria conexa (INTERPRETE/PRODUTOR/MUSICO), percentual aplicado, valor bruto da obra, valor do crédito, status (LIBERADO/RETIDO), motivo da retenção | pertence a: Processo de Distribuição; referencia: Titular, Obra, Fonograma (Cadastro) |
| Crédito Retido | Crédito bloqueado por pendência cadastral. Permanece retido até que a pendência seja resolvida no Cadastro e um novo processo de distribuição libere-o. | motivo (OBRA_PENDENTE/OBRA_BLOQUEADA/TITULAR_SEM_ASSOCIACAO), data de retenção, data de liberação (quando aplicável) | é um: Crédito com status RETIDO |
| Ajuste | Correção de créditos gerada por estorno de pagamento na Arrecadação após a distribuição já ter sido calculada. Aplicado no próximo processo de distribuição da mesma rubrica+período. | rubrica, período, valor do estorno, processo de origem, processo de aplicação | aplicado em: Processo de Distribuição |
| Demonstrativo | Relatório consolidado por titular — equivalente a um "holerite" de direitos autorais. Detalha todos os créditos e débitos (ajustes) do titular em um processo, incluindo retidos recém-liberados. | titular_id, processo_id, créditos detalhados (obra, categoria, percentual, valor), retidos liberados, ajustes, valor total | gerado a partir de: Créditos do Processo |
| Rubrica (cópia local) | Cópia local da rubrica mantida pelo domínio Arrecadação. Sincronizada via eventos para evitar acoplamento HTTP runtime. | sigla, nome, exige classificação | sincronizada via: eventos `arrecadacao.rubrica.criada`/`atualizada` |

### Estados do Processo de Distribuição

```
CRIADO → CALCULADO → APROVADO → FINALIZADO
   ↓         ↓          ↓
CANCELADO  CANCELADO  CANCELADO
```

- **CRIADO** — Processo criado pelo Analista, aguardando execução do cálculo. Neste estado, o Analista seleciona a rubrica+período e o sistema valida a existência de Rol fechado e Verba disponível.
- **CALCULADO** — Cálculo executado com sucesso. Créditos gerados (liberados e retidos). Analista pode revisar antes de aprovar.
- **APROVADO** — Analista revisou e aprovou os créditos calculados. Demonstrativos podem ser gerados.
- **FINALIZADO** — Processo encerrado. Publica `distribuicao.rol.processado` para bloquear cancelamento do Rol na Identificação. Créditos são definitivos.
- **CANCELADO** — Processo invalidado antes da finalização. Créditos descartados.

---

## 4. Features Previstas (Planned Features)

| # | Feature | Descrição | Prioridade | Status | PRD |
|---|---|---|---|---|---|
| F01 | Sincronização de Rubricas | Consumir eventos `arrecadacao.rubrica.criada`/`atualizada` e manter cópia local das rubricas. Event-driven ACL sem acoplamento HTTP runtime. | Must Have | `prd-ready` | `tasks/distribuicao/prd-sync-rubricas/prd.md` |
| F02 | Gestão de Processos de Distribuição | Criar, listar e acompanhar processos de distribuição por rubrica+período. Máquina de estados (CRIADO → CALCULADO → APROVADO → FINALIZADO / CANCELADO). Validação de pré-requisitos (Rol fechado + Verba disponível). | Must Have | `prd-ready` | `tasks/distribuicao/prd-gestao-processos/prd.md` |
| F03 | Cálculo de Créditos | Core do domínio. Cruza verba líquida com Rol ponderado (quantidade × peso), aplica split 66,67% autoral / 33,33% conexo, distribui dentro de cada parte usando percentuais do Cadastro. Processo idempotente. | Must Have | `planned` | — |
| F04 | Retenção de Créditos | Identificar e reter créditos quando a obra está PENDENTE/BLOQUEADA ou o titular não tem associação vinculada. Registrar motivo da retenção. | Must Have | `planned` | — |
| F05 | Liberação de Créditos Retidos | Na execução de um novo processo, verificar se pendências de créditos retidos anteriores foram resolvidas no Cadastro e liberar os créditos correspondentes. Informação visível no demonstrativo. | Must Have | `planned` | — |
| F06 | Ajustes por Estorno | Consumir evento `arrecadacao.pagamento.estornado` e registrar ajuste a ser aplicado no próximo processo de distribuição da rubrica+período afetado. | Must Have | `planned` | — |
| F07 | Demonstrativo de Créditos | Gerar demonstrativo por titular — "holerite" detalhando créditos por obra, categoria, percentual e valor. Inclui retidos liberados e ajustes por estorno. Consulta por titular e por processo. | Must Have | `planned` | — |

**Prioridades (MoSCoW):** `Must Have` · `Should Have` · `Could Have` · `Won't Have`
**Status possíveis:** `planned` · `prd-ready` · `in-progress` · `done` · `out-of-scope`

---

## 5. Dependências (Domain Dependencies)

### Depende de (Upstream)

| Domínio | O que consome | Tipo | Criticidade |
|---|---|---|---|
| Cadastro | Titularidades autorais (percentuais por obra) e participações conexas (percentuais por fonograma) para calcular a distribuição de créditos | Consulta HTTP (Open Host Service) | Alta |
| Cadastro | Status de obras/fonogramas e vínculo titular-associação para determinar retenções | Consulta HTTP (Open Host Service) | Alta |
| Identificação | Rol de Execuções fechado (rubrica, período, execuções identificadas com obra_id, fonograma_id, tipo de utilização e peso) | Evento assíncrono `identificacao.rol.fechado` | Alta |
| Identificação | Invalidação de Rol cancelado | Evento assíncrono `identificacao.rol.cancelado` | Média |
| Arrecadação | Verba líquida por rubrica+período | Evento assíncrono `arrecadacao.verba.disponivel` | Alta |
| Arrecadação | Notificação de estorno para gerar ajustes | Evento assíncrono `arrecadacao.pagamento.estornado` | Alta |
| Arrecadação | Dados de rubricas para cópia local | Evento assíncrono `arrecadacao.rubrica.criada`/`atualizada` | Média |

### Fornece para (Downstream)

| Domínio | O que fornece | Tipo | Criticidade |
|---|---|---|---|
| Identificação | Confirmação de que o Rol foi processado (bloqueia cancelamento na Identificação) | Evento assíncrono `distribuicao.rol.processado` | Alta |
| Analytics | Eventos de mudança de estado dos processos e créditos | Evento assíncrono (RabbitMQ) | Média |

### Integrações Externas (External Integrations)

| Sistema Externo | Finalidade | Direção | Status |
|---|---|---|---|
| Nenhum | A Distribuição é auto-contida nesta PoC | — | — |

---

## 6. Regras de Negócio (Business Rules)

| ID | Regra | Origem |
|---|---|---|
| RN-01 | A verba líquida de cada obra é dividida em 66,67% para a parte autoral e 33,33% para a parte conexa. A parte autoral é distribuída conforme os percentuais de titularidade cadastrados na obra. A parte conexa é distribuída conforme as participações conexas cadastradas no fonograma. | Regulamento de Distribuição |
| RN-02 | Obra sem fonograma identificado no Rol recebe 100% da verba na parte autoral (sem parte conexa) | Regulamento de Distribuição |
| RN-03 | A participação de cada obra na verba total é ponderada por `quantidade_de_execuções × peso_do_tipo_de_utilização` (ex: 10 execuções como BK com peso 1/12 = 0,833 pontos ponderados) | Regulamento de Distribuição |
| RN-04 | A subdivisão da parte conexa segue os percentuais do Cadastro: com músico executante → 43,7% intérprete / 41,7% produtor / 14,6% músicos (÷ N igualitário); sem músico → 50% intérprete / 50% produtor | Regulamento de Distribuição |
| RN-05 | Crédito é retido quando a obra está com status PENDENTE ou BLOQUEADA, ou quando o titular não possui associação vinculada | Regulamento de Distribuição |
| RN-06 | Créditos retidos são liberados na próxima execução do processo de distribuição, quando a pendência cadastral tiver sido resolvida. A liberação aparece no demonstrativo do titular | Regulamento de Distribuição |
| RN-07 | Estorno de pagamento na Arrecadação (evento `arrecadacao.pagamento.estornado`) após distribuição já calculada gera um ajuste a ser aplicado no próximo processo de distribuição da mesma rubrica+período | Consistência entre domínios |
| RN-08 | O processo de distribuição é idempotente — reprocessar o mesmo Rol de Execuções não pode gerar créditos duplicados | Requisito técnico de integridade |
| RN-09 | Valores monetários e percentuais utilizam tipos decimais de alta precisão (Decimal/Money). Nunca float/double | Requisito técnico de integridade |
| RN-10 | Cada processo de distribuição opera sobre exatamente 1 rubrica + 1 período. Não há distribuição multi-rubrica no mesmo processo | Simplificação para PoC |
| RN-11 | Prescrição de créditos retidos (regra de 5 anos) está fora do escopo desta PoC | Simplificação para PoC |
| RN-12 | O processo de distribuição é iniciado manualmente pelo Analista de Distribuição | Decisão de produto |
| RN-13 | Para criar um processo, devem existir: (a) Rol fechado para a rubrica+período e (b) Verba líquida disponível para a rubrica+período | Integridade de negócio |
| RN-14 | Ao finalizar o processo, o evento `distribuicao.rol.processado` é publicado para que a Identificação bloqueie o cancelamento do Rol utilizado | Consistência entre domínios |

---

## 7. Eventos do Domínio (Domain Events)

### Produz (Publishes)
- `distribuicao.processo.criado` — processo de distribuição iniciado pelo Analista para uma rubrica+período
- `distribuicao.processo.calculado` — cálculo de créditos concluído com sucesso; créditos gerados
- `distribuicao.processo.aprovado` — Analista revisou e aprovou os créditos calculados
- `distribuicao.processo.finalizado` — processo encerrado definitivamente; créditos são definitivos
- `distribuicao.processo.cancelado` — processo invalidado antes da finalização
- `distribuicao.rol.processado` — Rol utilizado no cálculo; Identificação deve bloquear cancelamento do Rol correspondente
- `distribuicao.credito.retido` — crédito bloqueado por pendência cadastral; contém titular, obra, motivo
- `distribuicao.credito.liberado` — crédito anteriormente retido foi liberado após resolução de pendência

### Consome (Subscribes)
- `identificacao.rol.fechado` (de: Identificação) — armazena snapshot do Rol de Execuções para uso no cálculo
- `identificacao.rol.cancelado` (de: Identificação) — invalida snapshot do Rol; bloqueia criação de processo para esse Rol
- `arrecadacao.verba.disponivel` (de: Arrecadação) — armazena snapshot da verba líquida por rubrica+período
- `arrecadacao.pagamento.estornado` (de: Arrecadação) — registra ajuste pendente para próximo processo
- `arrecadacao.rubrica.criada` (de: Arrecadação) — sincroniza cópia local da rubrica
- `arrecadacao.rubrica.atualizada` (de: Arrecadação) — atualiza cópia local da rubrica

---

## 8. Estratégia de Desenvolvimento (Development Strategy)

### Ordem de Implementação Sugerida
1. **F01 — Sincronização de Rubricas** — sem dependência interna, habilita referência a rubricas no domínio
2. **F02 — Gestão de Processos de Distribuição** — base do domínio, implementa máquina de estados e RN-10, RN-12, RN-13
3. **F03 — Cálculo de Créditos** — core do domínio, depende de F01+F02, implementa RN-01 a RN-04, RN-08, RN-09
4. **F04 — Retenção de Créditos** — depende de F03, implementa RN-05
5. **F05 — Liberação de Créditos Retidos** — depende de F04, implementa RN-06
6. **F06 — Ajustes por Estorno** — depende de F03, implementa RN-07
7. **F07 — Demonstrativo de Créditos** — depende de F03+F04+F05+F06, consolida todas as informações no "holerite" do titular

### Riscos do Domínio

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Complexidade do algoritmo de cálculo — ponderação por peso, split em dois níveis (autoral/conexo + por titular), obras com e sem fonograma | Alta | Alto | Começar com cenário simples (1 obra, 1 titular autoral, 1 fonograma com 1 conexo) e expandir incrementalmente. Testes unitários extensivos por cenário. |
| Consulta HTTP ao Cadastro durante cálculo pode ser lenta para Rols grandes | Média | Médio | Coletar todas as titularidades necessárias em batch antes do cálculo (ACL com cache local por processo) |
| Race condition entre eventos de Arrecadação (estorno) e execução do cálculo | Baixa | Alto | Usar snapshot da verba no momento da criação do processo; estornos posteriores geram ajustes, nunca recalculam |
| Inconsistência entre percentuais do Cadastro e valores esperados (arredondamento acumulado) | Média | Médio | Algoritmo de alocação de remanescente (mesmo padrão do Cadastro — RN-12 do Cadastro); validação de soma = 100% em testes |
| Formato dos eventos da Identificação e Arrecadação pode divergir do esperado | Baixa | Alto | Definir contratos de evento nos PRDs com schema explícito; testes de integração com eventos reais |

---

## 9. Questões em Aberto (Open Questions)

- [x] ~~Disparo manual ou automático?~~ → Resolvido: manual pelo Analista (RN-12)
- [x] ~~Processo com estados ou execute-once?~~ → Resolvido: CRIADO → CALCULADO → APROVADO → FINALIZADO / CANCELADO
- [x] ~~Obra sem fonograma?~~ → Resolvido: 100% autoral (RN-02)
- [x] ~~Prescrição de retidos na PoC?~~ → Resolvido: fora do escopo (RN-11)
- [x] ~~Estorno pós-distribuição?~~ → Resolvido: gera ajuste no próximo processo (RN-07)
- [x] ~~Demonstrativo: formato?~~ → Resolvido: holerite por titular com detalhamento completo

Todas as questões foram resolvidas. Domain Doc pronto para geração de PRDs.

---

*Domain Doc gerado com a skill `flow-domain-creator`. Para criar PRDs das features deste domínio, use a skill `flow-prd-creator` fornecendo o `vision.md` e este `domain.md` como contexto.*
