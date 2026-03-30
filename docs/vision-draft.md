# Product Vision — mini-ECAD
### Plataforma de Demonstração de Gestão Coletiva de Direitos Autorais

> **Tipo:** Demo / Proof of Concept  
> **Objetivo:** Materializar os padrões de arquitetura de microsserviços do ECAD usando domínios reais de negócio  
> **Versão:** 1.0 — draft inicial  
> **Audiência:** Time de Plataforma / Arquitetura de TI

---

## Índice

1. [Elevator Pitch](#1-elevator-pitch)
2. [Problema](#2-problema)
3. [Solução](#3-solução)
4. [Mapa de Contextos DDD](#4-mapa-de-contextos-ddd)
5. [Visão de Produto por Contexto](#5-visão-de-produto-por-contexto)
6. [Arquitetura de Referência](#6-arquitetura-de-referência)
7. [Épicos e Features](#7-épicos-e-features)
8. [Definition of Ready / Definition of Done](#8-definition-of-ready--definition-of-done)
9. [Roadmap de Fases](#9-roadmap-de-fases)
10. [Restrições e Decisões Técnicas](#10-restrições-e-decisões-técnicas)
11. [Glossário do Domínio](#11-glossário-do-domínio)

---

## 1. Elevator Pitch

> **Para** o time de arquitetura e engenharia de plataforma do ECAD,  
> **que** precisa de uma referência concreta dos padrões arquiteturais adotados,  
> **o mini-ECAD** é uma aplicação de demonstração com domínio de negócio real,  
> **que** materializa Schema-per-Service, CQRS, API Composition, Event-Driven e Data Warehouse  
> usando os cinco contextos delimitados do processo de distribuição de direitos autorais.  
> **Diferente de** um CRUD genérico ou um exemplo de e-commerce,  
> **nosso produto** usa a linguagem ubíqua real do ECAD — obras, fonogramas, titulares, verbas e créditos —  
> tornando os padrões técnicos diretamente aplicáveis ao sistema de produção.

---

## 2. Problema

### 2.1 Contexto

O ECAD está construindo sua fundação de plataforma — bibliotecas compartilhadas, infraestrutura Kubernetes, padrões de observabilidade e identidade. Para que os times de desenvolvimento adotem esses padrões, é necessária uma **aplicação de referência** que demonstre como tudo se conecta.

### 2.2 Problemas identificados

| # | Problema | Impacto |
|---|----------|---------|
| P1 | Exemplos genéricos (e-commerce, pedidos/estoque) não ressoam com o time — o domínio é muito diferente do negócio real | Baixa adoção dos padrões |
| P2 | A divisão de responsabilidades entre os sistemas legados não é clara — fronteiras de contexto misturadas | Acoplamento, dificuldade de evolução |
| P3 | Não existe referência de como gerar relatórios analíticos sem JOINs cross-schema | Times criam atalhos que violam o isolamento |
| P4 | A regra de distribuição (autoral × conexo × categorias) nunca foi modelada explicitamente em código | Conhecimento tácito, risco de perda |

### 2.3 O que NÃO é o problema

- Substituir o sistema de produção do ECAD
- Cobrir 100% das rubricas e regras do Regulamento
- Atingir escala de produção (bilhões de execuções/ano)

---

## 3. Solução

O mini-ECAD é uma aplicação multi-contexto rodando em **Docker Compose** que:

- Usa o **domínio real** do ECAD (obras, fonogramas, titulares, execuções, verbas, créditos)
- Implementa **5 contextos delimitados** como microsserviços independentes
- Demonstra os **4 padrões arquiteturais** centrais da plataforma
- Serve como **living documentation** — o código é a documentação

### Padrões demonstrados

| Padrão | Onde aparece no mini-ECAD |
|--------|--------------------------|
| Schema-per-Service | Cada contexto tem schema e usuário PostgreSQL próprios, sem cross-schema |
| CQRS + Read Model | Analytics-consumer mantém schema desnormalizado alimentado por eventos |
| API Composition / BFF | BFF agrega dados de múltiplos contextos em chamadas paralelas |
| Event-Driven | RabbitMQ como backbone de integração entre contextos |
| Data Warehouse | ClickHouse alimentado por eventos para analytics analítico |

---

## 4. Mapa de Contextos DDD

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         MINI-ECAD — Context Map                          │
└──────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────┐         ┌──────────────────────────┐
  │      CADASTRO       │         │      IDENTIFICAÇÃO        │
  │                     │         │                           │
  │  Obra Musical       │         │  Captação                 │
  │  Fonograma          │         │  Rol de Execuções         │
  │  Titular            │◄────────│  Execução Identificada    │
  │  Titularidade       │  ACL    │  Tipo de Utilização       │
  │  Associação         │  (ref)  │  Rubrica                  │
  └─────────────────────┘         └────────────┬─────────────┘
            │                                  │
            │ ACL (ref)                         │ evento: execucao.identificada
            │                                  │
  ┌─────────▼─────────┐            ┌───────────▼──────────────┐
  │    ARRECADAÇÃO    │            │       DISTRIBUIÇÃO        │
  │                   │            │                           │
  │  Usuário          │            │  Verba por Rubrica        │
  │  Licença          │────────────►  Rol de Execuções         │
  │  Rubrica          │  evento:   │  Cálculo Autoral/Conexo   │
  │  Período          │  verba.    │  Crédito por Titular      │
  │  Verba Líquida    │  disponivel│  Crédito Retido           │
  └───────────────────┘            └───────────────────────────┘

  Relações:
  ── ACL (Anti-Corruption Layer): contexto downstream traduz o modelo upstream
  ── evento: integração assíncrona via RabbitMQ
  ── (ref): referência fraca por ID, sem FK cross-schema
```

### 4.1 Tipos de relacionamento entre contextos

| De | Para | Tipo | Mecanismo |
|----|------|------|-----------|
| Identificação → Cadastro | Downstream / ACL | Consulta HTTP ao cadastrar execução (validar obra_id) |
| Arrecadação → Distribuição | Published Language | Evento `verba.disponivel` com estrutura padronizada |
| Identificação → Distribuição | Published Language | Evento `execucao.identificada` com rol do período |
| Cadastro → Distribuição | Open Host Service | API REST consultada pela Distribuição para obter titularidades |

---

## 5. Visão de Produto por Contexto

---

### 5.1 Contexto: Cadastro

**Missão:** Ser a fonte de verdade do master data musical. Qualquer informação sobre o que existe (obras, gravações, pessoas) vive aqui.

**Subdomínio:** Core domain — é o coração do negócio do ECAD.

**Agregados principais:**

```
ObraMusical
├── id (ISWC)
├── titulo
├── subtitulo
├── genero
├── tipo: MUSICAL | LITEROMUSICAL | VERSAO | POT_POURRI
├── status: LIBERADO | BLOQUEADO | PENDENTE | DUPLICIDADE | DOMINIO_PUBLICO
├── titularidades[]
│   ├── titular_id
│   ├── categoria: AUTOR | EDITOR | SUBEDITOR | VERSIONISTA
│   └── percentual  ← soma deve ser 100%
└── referencias_de_interpretacao[]  ← link para Fonograma

Fonograma
├── id (ISRC)
├── obra_id  ← referência à ObraMusical
├── status: LIBERADO | PENDENTE_VALIDACAO | PENDENTE_DOCUMENTACAO | DUPLICIDADE
├── pais_origem
├── data_gravacao
├── data_lancamento
├── titulares_conexos[]
│   ├── titular_id
│   ├── categoria: INTERPRETE | PRODUTOR_FONOGRAFICO | MUSICO_EXECUTANTE
│   └── percentual  ← 41,7% / 41,7% / 16,6% (ou 50/50 sem músico)
└── produtor_responsavel_id

Titular
├── id (CAE/IPI)
├── nome
├── cpf | cnpj
├── tipo: PESSOA_FISICA | PESSOA_JURIDICA
├── nacionalidade
├── associacao_id
├── categorias[]  ← um titular pode ser autor E intérprete
└── status: ATIVO | FALECIDO | TRANSFERINDO
```

**Invariantes de negócio:**
- Percentuais de titularidade autoral devem somar exatamente 100%
- Fonograma nacional exige ao menos um Produtor Fonográfico
- Obra só é `LIBERADA` se todos os dados obrigatórios estiverem preenchidos
- Obras com mesmo título e ao menos um autor em comum entram em verificação de duplicidade

**Eventos publicados:**

| Evento | Trigger |
|--------|---------|
| `cadastro.obra.liberada` | Obra passa para status LIBERADO |
| `cadastro.obra.bloqueada` | Conflito detectado |
| `cadastro.fonograma.liberado` | Fonograma validado |
| `cadastro.titular.criado` | Novo titular filiado |
| `cadastro.dominio-publico.atualizado` | Obra/fonograma entra em DP |

---

### 5.2 Contexto: Identificação

**Missão:** Captar e identificar execuções musicais. Transformar "o que tocou, onde e quando" em um rol estruturado pronto para a Distribuição consumir.

**Subdomínio:** Core domain — sem identificação não há distribuição.

**Agregados principais:**

```
Captacao
├── id
├── rubrica: RADIO | TV_ABERTA | TV_FECHADA | STREAMING | SHOW | CINEMA | ...
├── usuario_id  ← referência fraca ao contexto Arrecadação
├── periodo_inicio
├── periodo_fim
├── origem: PLANILHA_USUARIO | GRAVACAO_ECAD | API_PLATAFORMA
└── status: RECEBIDA | PROCESSANDO | IDENTIFICADA | ERRO

ExecucaoIdentificada
├── id
├── captacao_id
├── obra_id        ← referência fraca ao Cadastro (pode ser null se não identificada)
├── fonograma_id   ← referência fraca ao Cadastro (opcional)
├── status_identificacao: IDENTIFICADA | PENDENTE | NAO_IDENTIFICADA
├── emissora / plataforma
├── executada_em (datetime)
├── duracao_seg
├── tipo_utilizacao: TA | TE | TP | PE | TM | TB | DM | BK
└── peso  ← calculado a partir do tipo_utilizacao

RolDeExecucoes
├── id
├── rubrica
├── periodo_referencia (mês/ano)
├── total_execucoes
├── total_identificadas
├── percentual_identificacao
└── execucoes[]  ← lista de ExecucaoIdentificada
```

**Pesos por tipo de utilização:**

| Tipo | Descrição | Peso |
|------|-----------|------|
| TA | Tema de abertura | 12 |
| TE | Tema de encerramento | 12 |
| TP | Tema de personagem | 8 |
| PE | Performance cênica | 6 |
| TM | Tema | 4 |
| TB | Tema de bloco | 4 |
| DM | Demais obras | 2 |
| BK | Background | 1 |

**Eventos publicados:**

| Evento | Trigger |
|--------|---------|
| `identificacao.captacao.recebida` | Planilha ou gravação recebida |
| `identificacao.rol.fechado` | Rol do período finalizado e pronto para distribuição |
| `identificacao.execucao.nao-identificada` | Obra não encontrada no Cadastro |

---

### 5.3 Contexto: Arrecadação

**Missão:** Registrar os usuários licenciados, os valores pagos por rubrica/período e disponibilizar a verba líquida para a Distribuição.

**Subdomínio:** Supporting domain — relevante, mas o cálculo de valor não é aqui.

**Agregados principais:**

```
Usuario
├── id
├── razao_social
├── cnpj
├── segmento: RADIO | TV_ABERTA | TV_FECHADA | STREAMING | SHOW | CINEMA | ...
├── uf
├── status_licenca: ADIMPLENTE | INADIMPLENTE | ISENTO
└── historico_pagamentos[]

Licenca
├── id
├── usuario_id
├── rubrica
├── periodo_referencia
├── valor_bruto
├── percentual_administrativo  ← padrão 15% (10% ECAD + 5% associações)
├── valor_liquido              ← valor_bruto × (1 - percentual_administrativo)
└── status: PAGA | PENDENTE | PARCELADA

VerbaDisponivel
├── id
├── rubrica
├── periodo_referencia
├── valor_total_liquido   ← soma das licenças do período
└── status: ABERTA | FECHADA | DISTRIBUIDA
```

**Regra de negócio central:**
```
valor_liquido = valor_bruto × 0,85
    └── 10% → custos ECAD
    └──  5% → associações
    └── 85% → base de distribuição
```

**Eventos publicados:**

| Evento | Trigger |
|--------|---------|
| `arrecadacao.verba.disponivel` | VerbaDisponivel fechada e pronta para distribuição |
| `arrecadacao.licenca.inadimplente` | Usuário em atraso |
| `arrecadacao.usuario.cadastrado` | Novo usuário licenciado |

---

### 5.4 Contexto: Distribuição

**Missão:** Calcular e registrar quanto cada titular tem a receber, cruzando o rol de execuções identificadas com a verba líquida disponível e as titularidades cadastradas. É o contexto orquestrador — consome os outros três, mas não pertence a nenhum deles.

**Subdomínio:** Core domain — a razão de existir do ECAD.

**Agregados principais:**

```
ProcessoDeDistribuicao
├── id
├── rubrica
├── periodo_referencia
├── verba_id         ← ref. Arrecadação
├── rol_id           ← ref. Identificação
├── status: INICIADO | CALCULANDO | CALCULADO | PAGO | CANCELADO
├── valor_total
├── total_execucoes_rol
├── valor_por_execucao_base   ← valor_total ÷ soma_ponderada_execucoes
└── creditos[]

CreditoPorTitular
├── id
├── processo_id
├── obra_id          ← ref. Cadastro
├── fonograma_id     ← ref. Cadastro (nullable para música ao vivo)
├── titular_id       ← ref. Cadastro
├── associacao_id
├── categoria: AUTOR | EDITOR | INTERPRETE | PRODUTOR_FONOGRAFICO | MUSICO_EXECUTANTE
├── tipo_direito: AUTORAL | CONEXO
├── execucoes_ponderadas   ← soma(peso × qtd_execucoes) da obra no rol
├── percentual_titularidade
├── valor_calculado
└── status: CALCULADO | RETIDO | LIBERADO | PAGO | PRESCRITO
```

**Algoritmo de cálculo — o coração do sistema:**

```
Para cada obra no rol do período:

  1. execucoes_ponderadas(obra) = Σ(peso_tipo_utilizacao × qtd_execucoes)

  2. participacao_obra = execucoes_ponderadas(obra) ÷ Σ execucoes_ponderadas(todas_obras)

  3. verba_obra = verba_total_liquida × participacao_obra

  4. SE obra tem fonograma executado:
       verba_autoral = verba_obra × 0,6667
       verba_conexa  = verba_obra × 0,3333
     SENÃO (música ao vivo):
       verba_autoral = verba_obra × 1,0
       verba_conexa  = 0

  5. Para cada titular autoral da obra:
       credito = verba_autoral × percentual_titularidade_cadastro

  6. Para cada titular conexo do fonograma:
       credito = verba_conexa × percentual_cadastro_fonograma
       (41,7% intérprete / 41,7% produtor / 16,6% músico)
```

**Regras de retenção de crédito:**

| Condição | Ação |
|----------|------|
| Obra com status `PENDENTE` ou `BLOQUEADA` | Crédito retido por até 5 anos |
| Titular sem associação identificada | Crédito retido |
| Fonograma `PENDENTE_VALIDACAO` | Parcela conexa retida |
| Crédito retido há mais de 5 anos | Distribuído como "crédito prescrito" |

**Eventos publicados:**

| Evento | Trigger |
|--------|---------|
| `distribuicao.processo.iniciado` | Cálculo começa |
| `distribuicao.credito.calculado` | Crédito individual calculado |
| `distribuicao.credito.retido` | Crédito não pode ser liberado |
| `distribuicao.processo.concluido` | Todos os créditos calculados |

---

## 6. Arquitetura de Referência

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND  :3000                           │
│              React SPA — cadastros + relatórios              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP
                    ┌──────▼──────┐
                    │   BFF API   │  :5000
                    │  (Composition│
                    │  + Analytics)│
                    └──┬──┬──┬──┬─┘
                       │  │  │  │  HTTP
          ┌────────────┘  │  │  └──────────────┐
          │               │  │                  │
    ┌─────▼──────┐  ┌─────▼──┐  ┌──────────┐  ┌▼────────────┐
    │  cadastro  │  │  ident │  │  arrec.  │  │  distrib.   │
    │    :5001   │  │  :5002 │  │  :5003   │  │   :5004     │
    └─────┬──────┘  └────┬───┘  └────┬─────┘  └─────────────┘
          │              │            │
          └──────────────┴────────────┘
                         │ publica eventos
                    ┌────▼─────┐
                    │ RabbitMQ │  :5672 / :15672
                    └────┬─────┘
                         │ consome
          ┌──────────────┼──────────────┐
          │              │              │
    ┌─────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐
    │ analytics  │ │  dw-sync   │ │  distrib. │
    │ consumer   │ │            │ │  consumer │
    └─────┬──────┘ └─────┬──────┘ └───────────┘
          │              │
    ┌─────▼──────┐ ┌─────▼──────┐
    │ PostgreSQL │ │ ClickHouse │
    │  (OLTP)    │ │   (OLAP)   │
    │            │ └────────────┘
    │ schema:    │
    │  cadastro  │      :8123
    │  identific.│
    │  arrecadac.│ ┌────────────┐
    │  distribui.│ │  Metabase  │  :3001
    │  analytics │ └────────────┘
    └────────────┘
```

### Decisões de infraestrutura

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| APIs | .NET 8 Minimal API | Linguagem principal do ECAD |
| Banco OLTP | PostgreSQL 16 | Schema-per-service via grants |
| Banco OLAP | ClickHouse 24 | Colunar, queries analíticas em ms |
| Mensageria | RabbitMQ 3.13 | Broker AMQP já conhecido no ECAD |
| BI / Dashboards | Metabase | Baixa curva de entrada para negócio |
| Orquestração local | Docker Compose | Zero infraestrutura para rodar o demo |

---

## 7. Épicos e Features

### Épico 1 — Cadastro

| ID | Feature | Descrição |
|----|---------|-----------|
| C-01 | Gestão de Obras Musicais | CRUD de obras com validação de percentuais (soma = 100%), tipos e status |
| C-02 | Gestão de Fonogramas | CRUD com ISRC, vínculo à obra, participação conexa automática (41,7/41,7/16,6) |
| C-03 | Gestão de Titulares | CRUD com categorias autorais e conexas, vínculo a associação |
| C-04 | Titularidades | Associação titular ↔ obra com percentual e categoria |
| C-05 | Controle de Status | Fluxo LIBERADO / BLOQUEADO / PENDENTE com regras de transição |
| C-06 | Domínio Público | Marcação automática de obras/fonogramas em DP por data |
| C-07 | Eventos de Cadastro | Publicação de eventos no RabbitMQ a cada mudança relevante |

### Épico 2 — Identificação

| ID | Feature | Descrição |
|----|---------|-----------|
| I-01 | Ingestão de Planilha | Upload ou entrada manual de execuções por usuário/período |
| I-02 | Identificação de Obra | Match automático por ISRC / ISWC / título ao receber execução |
| I-03 | Tipo de Utilização | Atribuição de tipo (TA, BK, PE...) e cálculo do peso |
| I-04 | Fechamento de Rol | Operação que sela o rol de um período e publica evento |
| I-05 | Pendências de Identificação | Fila de execuções não identificadas para revisão manual |

### Épico 3 — Arrecadação

| ID | Feature | Descrição |
|----|---------|-----------|
| A-01 | Gestão de Usuários | Cadastro de usuários licenciados por segmento e UF |
| A-02 | Registro de Licenças | Lançamento de pagamentos por rubrica/período |
| A-03 | Cálculo de Verba Líquida | Dedução automática dos percentuais administrativos (15%) |
| A-04 | Fechamento de Verba | Operação que fecha a verba do período e publica evento |
| A-05 | Controle de Inadimplência | Status de licença e bloqueio de usuário inadimplente |

### Épico 4 — Distribuição

| ID | Feature | Descrição |
|----|---------|-----------|
| D-01 | Iniciar Processo | Criar ProcessoDeDistribuicao a partir de verba + rol do mesmo período/rubrica |
| D-02 | Cálculo de Valor por Execução | verba_liquida ÷ soma ponderada das execuções do rol |
| D-03 | Cálculo Autoral × Conexo | Aplicar split 66,67% / 33,33% por obra |
| D-04 | Cálculo por Titular | Distribuir créditos individuais conforme percentuais de titularidade |
| D-05 | Créditos Retidos | Identificar e reter créditos de cadastros pendentes/bloqueados |
| D-06 | Demonstrativo por Titular | Relatório de créditos por titular no período |
| D-07 | Liberação de Créditos | Fluxo de aprovação e liberação para pagamento |

### Épico 5 — Plataforma (transversal)

| ID | Feature | Descrição |
|----|---------|-----------|
| P-01 | Read Model Analytics | Consumer que mantém schema analytics desnormalizado |
| P-02 | Data Warehouse | DW Sync para ClickHouse com fatos de execução e distribuição |
| P-03 | BFF / API Composition | Visão consolidada por obra agregando 4 contextos |
| P-04 | Frontend SPA | Interface para todos os cadastros, operações e relatórios |
| P-05 | Dashboard BI | Dashboards no Metabase sobre execuções, verbas e créditos |

---

## 8. Definition of Ready / Definition of Done

### Definition of Ready (para uma feature entrar em desenvolvimento)

- [ ] Contexto DDD identificado (qual dos 4 contextos)
- [ ] Linguagem ubíqua alinhada (termos do domínio, não termos técnicos)
- [ ] Agregados e invariantes de negócio descritos
- [ ] Eventos que a feature publica ou consome identificados
- [ ] Schema do banco (qual schema PostgreSQL / tabela ClickHouse) definido
- [ ] Critérios de aceite escritos em linguagem de negócio

### Definition of Done (para uma feature ser considerada completa)

- [ ] Código implementado e buildando sem erros
- [ ] Endpoint documentado no Swagger (se API)
- [ ] Schema de banco versionado via migration (EF Core)
- [ ] Evento publicado no RabbitMQ com routing key padronizada (`contexto.agregado.acao`)
- [ ] Usuário PostgreSQL isolado sem acesso cross-schema (verificado via script)
- [ ] Ao menos um cenário de teste manual documentado
- [ ] Frontend reflete a feature (cadastro ou relatório)

---

## 9. Roadmap de Fases

### Fase 0 — Fundação ✅ (concluída)
> Infraestrutura base do demo

- [x] Docker Compose com PostgreSQL, RabbitMQ, ClickHouse, Metabase
- [x] Schema-per-service com grants isolados
- [x] Analytics consumer (CQRS Read Model)
- [x] DW Sync para ClickHouse
- [x] BFF com API Composition
- [x] Frontend básico com cadastros de obras, titulares e execuções
- [x] Cálculo simples de royalties (R$/segundo, sem regra de negócio real)

---

### Fase 1 — Domínio Rico de Cadastro
> Implementar o Cadastro com as regras reais do Regulamento

- [ ] C-01: Obra Musical com tipos (MUSICAL, LITEROMUSICAL, VERSAO, POT_POURRI)
- [ ] C-02: Fonograma com ISRC e participação conexa conforme regulamento
- [ ] C-03: Titular com separação autoral × conexo
- [ ] C-04: Titularidade com validação de 100%
- [ ] C-05: Fluxo de status (LIBERADO, BLOQUEADO, PENDENTE...)
- [ ] C-06: Domínio Público por data (70 anos)
- [ ] C-07: Eventos de cadastro no RabbitMQ

**Critério de aceite da fase:**
> Conseguir cadastrar "Garota de Ipanema" com Tom Jobim (50% autor) e Vinícius de Moraes (50% autor), fonograma com João Gilberto (intérprete 41,7%), EMI (produtor 41,7%) e Tom Jobim (músico executante 16,6%) — e o sistema validar todos os percentuais automaticamente.

---

### Fase 2 — Identificação e Rol
> Simular o recebimento de execuções de emissoras/plataformas

- [ ] I-01: Ingestão de execuções via planilha (CSV upload)
- [ ] I-02: Identificação automática por ISRC
- [ ] I-03: Tipo de utilização e peso (TA=12, BK=1, etc.)
- [ ] I-04: Fechamento de Rol por período/rubrica
- [ ] I-05: Execuções não identificadas com fila de revisão

**Critério de aceite da fase:**
> Fazer upload de uma planilha com 10 execuções de uma rádio simulada. O sistema identifica por ISRC, atribui pesos, e ao fechar o rol publica o evento `identificacao.rol.fechado`.

---

### Fase 3 — Arrecadação e Verba
> Registrar valores arrecadados e calcular a verba líquida disponível

- [ ] A-01: Cadastro de usuários por segmento (rádio, TV, streaming)
- [ ] A-02: Lançamento de pagamentos por rubrica/período
- [ ] A-03: Cálculo automático de verba líquida (85% do bruto)
- [ ] A-04: Fechamento da verba e publicação do evento
- [ ] A-05: Status de inadimplência

**Critério de aceite da fase:**
> Lançar pagamento de R$ 100.000 da "Rádio Nacional" referente ao 1º trimestre. O sistema calcula verba líquida de R$ 85.000 e publica `arrecadacao.verba.disponivel`.

---

### Fase 4 — Distribuição Real
> Implementar o algoritmo completo conforme o Regulamento

- [ ] D-01: Iniciar processo cruzando verba + rol do mesmo período/rubrica
- [ ] D-02: Cálculo de valor por execução ponderada
- [ ] D-03: Split autoral (66,67%) × conexo (33,33%)
- [ ] D-04: Créditos individuais por titular conforme percentuais
- [ ] D-05: Créditos retidos para cadastros pendentes
- [ ] D-06: Demonstrativo por titular
- [ ] D-07: Liberação para pagamento

**Critério de aceite da fase:**
> Executar distribuição da rubrica Rádio do 1º trimestre. O sistema gera créditos corretos para Tom Jobim (autor + músico), Vinícius (autor), João Gilberto (intérprete) e EMI (produtor). Percentuais batem com o regulamento.

---

### Fase 5 — Analytics e BI
> Enriquecer o Data Warehouse e os dashboards

- [ ] P-01: Read Model com dados das fases 1-4
- [ ] P-02: Fatos de distribuição no ClickHouse
- [ ] P-03: Dashboards Metabase: top obras, top titulares, verba por rubrica
- [ ] P-04: Frontend com telas de demonstrativo e relatório de distribuição
- [ ] P-05: Documentação do Context Map atualizada

**Critério de aceite da fase:**
> No Metabase, visualizar "Top 10 obras por royalties no trimestre" e "Distribuição por categoria de titular (autoral vs conexo)" sem nenhum JOIN cross-schema.

---

## 10. Restrições e Decisões Técnicas

### Restrições assumidas para o demo

| # | Restrição | Decisão |
|---|-----------|---------|
| R1 | Uma única rubrica simulada por vez (sem múltiplas rubricas paralelas) | Simplifica o rateio sem perder a essência |
| R2 | Sem amostragem estatística — todas as execuções identificadas diretamente | Suficiente para demonstrar o cálculo |
| R3 | Sem integração com associações externas (ABRAMUS, UBC etc.) | Escopo de demo interno |
| R4 | Sem autenticação/autorização entre serviços (OAuth2/OIDC) | Será coberto pelas bibliotecas de plataforma (`ecad-oidc-spring-starter`) |
| R5 | Domínio Público por configuração manual, não por cálculo de datas reais | Simplificação de cadastro |

### Decisões de design

| Decisão | Alternativas consideradas | Justificativa |
|---------|--------------------------|---------------|
| Referências fracas entre schemas (sem FK cross-schema) | FK cross-schema, banco separado por MS | Simula exatamente o isolamento do Exadata Oracle de produção |
| RabbitMQ como broker | Kafka, Azure Service Bus | Já é o broker adotado no ECAD; menor overhead para demo |
| Eventos no formato CloudEvents | Formato proprietário | Alinha com o documento de padronização de eventos já produzido |
| .NET 8 Minimal API | Spring Boot, Node | Linguagem principal do time de desenvolvimento do ECAD |
| ClickHouse para DW | Postgres analytics, DuckDB | Melhor representa a separação física OLTP × OLAP |

---

## 11. Glossário do Domínio

| Termo | Contexto | Definição |
|-------|----------|-----------|
| **Obra Musical** | Cadastro | Composição protegida por direito autoral. Pode ser instrumental ou literomusical (com letra) |
| **Fonograma** | Cadastro | Gravação de uma obra musical. Identificado pelo ISRC |
| **Titular Autoral** | Cadastro | Criador da obra: Autor/Compositor, Editor, Subeditor, Versionista |
| **Titular Conexo** | Cadastro | Participante da gravação: Intérprete, Produtor Fonográfico, Músico Executante |
| **Titularidade** | Cadastro | Participação percentual de um titular em uma obra (soma obrigatória: 100%) |
| **ISRC** | Cadastro | Código internacional de identificação de fonograma (12 caracteres alfanuméricos) |
| **ISWC** | Cadastro | Código internacional de identificação de obra musical |
| **CAE/IPI** | Cadastro | Código internacional de identificação de titular |
| **Captação** | Identificação | Processo de obtenção das execuções musicais de um usuário em um período |
| **Rol de Execuções** | Identificação | Lista finalizada de obras/fonogramas identificados num período/rubrica |
| **Tipo de Utilização** | Identificação | Classificação do uso da música numa obra audiovisual (TA, BK, PE...) |
| **Rubrica** | Arrecadação / Identificação | Segmento de utilização: Rádio AM/FM, TV Aberta, Streaming, Show, Cinema... |
| **Usuário** | Arrecadação | Empresa/pessoa que utiliza música e paga licença ao ECAD |
| **Verba Líquida** | Arrecadação | Valor arrecadado após dedução dos percentuais administrativos (85% do bruto) |
| **Parte Autoral** | Distribuição | 66,67% da verba — distribuída entre compositores e editores |
| **Parte Conexa** | Distribuição | 33,33% da verba — distribuída entre intérpretes, produtores e músicos |
| **Crédito** | Distribuição | Valor calculado e atribuído a um titular específico num processo de distribuição |
| **Crédito Retido** | Distribuição | Crédito bloqueado por pendência cadastral (retido por até 5 anos) |
| **Domínio Público** | Cadastro | Obra cujo prazo de proteção patrimonial expirou (70 anos após morte do autor) |
| **Cue-sheet** | Identificação | Ficha técnica de obra audiovisual relacionando todas as músicas e seus tipos de uso |
| **Rol Retroativo** | Identificação | Execuções de períodos anteriores (até 3 anos) incluídas numa distribuição atual |
| **ACL** | Arquitetura | Anti-Corruption Layer — camada de tradução entre modelos de contextos diferentes |