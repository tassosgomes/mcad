# POC CDC Pipeline — Arquitetura v3 (Confluent Platform)

## Contexto

Validação da arquitetura de **dupla convivência** para migração do ECAD legado.
O fluxo é **unidirecional** com inversão no cutover:

```
Fase 1 (migração):  Legado (R/W) ──CDC──▶ mcad (R/O)
Fase 2 (cutover):   mcad (R/W) ──CDC──▶ Legado (R/O)
```

### Evolução dos documentos

| Versão | Premissa | Resultado |
|--------|----------|-----------|
| v1 | Debezium + Kafka (open source) | Baseline funcional, PostgreSQL simulando Oracle |
| v2 | Oracle GoldenGate (licenciado) | 3 opções (A/B/C). B e C requerem GG4BD (não temos) |
| **v3** | **Confluent Platform (Cloud ou self-managed)** | **Opções D, E, F — fully managed ou híbridas** |

### Por que avaliar Confluent?

1. **Conector Oracle XStream CDC** (GA março 2025) — usa mesma tecnologia do GoldenGate
   (XStream Out API) mas **a licença XStream vem bundled no subscription Confluent**,
   sem necessidade de licença GoldenGate separada
2. **Flink SQL** serverless (GA desde maio 2024) — substitui ksqlDB com SQL mais rico
3. **Fully managed** — elimina operação de Kafka, Connect, Schema Registry
4. **Ecossistema multi-target** — 70+ connectors gerenciados

---

## Nota sobre Licenciamento

### Confluent Oracle CDC Connectors

Confluent oferece **dois** conectores Oracle CDC proprietários (não são Debezium):

| Conector | Tecnologia | Licença Oracle extra? | Performance | Disponibilidade |
|----------|------------|:---------------------:|-------------|-----------------|
| Oracle CDC Source (LogMiner) | LogMiner API | **Nao** — LogMiner incluso em todas as edições Oracle | Baseline | GA (desde 2021) |
| Oracle CDC Source (XStream) | XStream Out API | **Nao** — Confluent bundle a licença XStream | **2-3x melhor que LogMiner** | GA (março 2025) |

> **Ponto-chave**: O conector XStream da Confluent usa a mesma engine de captura
> do GoldenGate (redo log via XStream Out), mas a Confluent tem acordo de licenciamento
> com a Oracle — o custo do XStream está embutido no subscription. Não precisa comprar
> GoldenGate. Isso elimina a barreira de licenciamento que descartou as opções B e C na v2.

### Confluent Pricing (consumption-based)

| Componente | Modelo | Estimativa |
|-----------|--------|-----------|
| Kafka cluster (Enterprise) | eCKU-hora | ~$895/mês (mínimo) |
| Oracle CDC connector (premium) | conector-hora + throughput | Variável por volume |
| Flink SQL | CFU-hora ($0.21/CFU-hora) | Variável por processamento |
| Schema Registry (Essentials) | Ambiente | Gratuito |
| Schema Registry (Advanced) | Ambiente-hora | $1/hora |
| Oracle JDBC Sink | conector-hora + throughput | Variável por volume |

> Novos clientes recebem **$400 em créditos** para avaliação.
> Descontos por compromisso anual disponíveis.

### Comparativo de licenciamento (todas as opções)

| Cenário | Licenças necessárias | Custo estimado 3 anos |
|---------|---------------------|----------------------|
| GoldenGate Standard (v2, Opção A) | GG Standard (já temos) | ~$46K (suporte) |
| GoldenGate + GG4BD (v2, Opção B) | GG Standard + GG4BD | ~$130K+ (licença + suporte) |
| **Confluent Cloud** (v3) | Confluent subscription | ~$72K-$288K (consumo) |
| **Confluent Platform** (self-managed) | Confluent Enterprise | ~$150K-$450K (subscription) |
| Debezium puro (v1) | Nenhuma (open source) | $0 (software) + infra + ops |

---

## Opção D — Confluent Cloud End-to-End (Fully Managed)

**Premissa**: Todo o pipeline CDC roda na Confluent Cloud. Captura via XStream,
transformação via Flink SQL, entrega via JDBC Sink. Zero infraestrutura auto-gerenciada.

```
┌──────────────────────┐
│   Oracle (Legado)    │
│   (on-premises)      │
│                      │
│  ecad_legado schema  │
│  ┌────────────────┐  │       ┌────────────────────────────────────────────────────┐
│  │ TB_ASSOCIACAO   │  │       │              Confluent Cloud                       │
│  │ TB_TITULAR      │  │       │                                                    │
│  │ TB_OBRA         │  │       │  ┌──────────────────┐   ┌────────────────┐        │
│  │ TB_TITULARIDADE │──┼──────▶│  │ Oracle XStream   │──▶│ Topics (raw)   │        │
│  │ TB_FONOGRAMA    │  │       │  │ CDC Source       │   │ ecad.legado.*  │        │
│  │ TB_PARTICIPACAO │  │       │  │ (managed)        │   └───────┬────────┘        │
│  │ TB_HIST_BLOQ    │  │       │  └──────────────────┘           │                 │
│  └────────────────┘  │       │                          ┌──────▼───────┐          │
└──────────────────────┘       │                          │  Flink SQL   │          │
                                │                          │  (serverless)│          │
                                │                          │  Transform   │          │
                                │                          └──────┬───────┘          │
                                │                                 │                  │
                                │   ┌──────────────────┐   ┌─────▼──────────┐       │
                                │   │ Schema Registry  │   │ Topics (MCAD_*)│       │
                                │   │ (Avro, managed)  │   └──────┬─────────┘       │
                                │   └──────────────────┘          │                  │
                                │                          ┌──────▼───────┐          │
                                │   ┌──────────────────┐   │ Oracle JDBC  │          │
                                │   │ Stream Governance│   │ Sink (managed│          │
                                │   │ (lineage,catalog)│   └──────┬───────┘          │
                                │   └──────────────────┘          │                  │
                                │                                 │                  │
                                │   ┌──────────────────┐          │                  │
                                │   │ Consumers opcionais         │                  │
                                │   │ (analytics, audit)│         │                  │
                                │   └──────────────────┘          │                  │
                                └─────────────────────────────────┼──────────────────┘
                                                                  │
                                                     ┌────────────▼─────────┐
                                                     │   Oracle (mcad)      │
                                                     │   (on-premises)      │
                                                     │                      │
                                                     │  ┌────────────────┐  │
                                                     │  │ cdc_staging    │  │
                                                     │  │ (flat, codigos)│  │
                                                     │  └───────┬────────┘  │
                                                     │          │ PROCEDURE │
                                                     │          │ resolve   │
                                                     │          │ FKs UUID  │
                                                     │  ┌───────▼────────┐  │
                                                     │  │ cadastro       │  │
                                                     │  │ (final, UUIDs) │  │
                                                     │  └────────────────┘  │
                                                     └──────────────────────┘
```

### Componentes

| Componente | Tipo | Gerenciamento |
|-----------|------|---------------|
| Oracle XStream CDC Source | Confluent Cloud connector (premium) | **Fully managed** |
| Kafka cluster (Enterprise) | Confluent Cloud | **Fully managed** |
| Schema Registry (Avro) | Confluent Cloud | **Fully managed** |
| Flink SQL | Confluent Cloud (serverless) | **Fully managed** |
| Oracle JDBC Sink | Confluent Cloud connector | **Fully managed** |
| Stream Governance | Confluent Cloud (lineage, catalog) | **Fully managed** |
| PL/SQL Procedure | Oracle mcad | Auto-gerenciado |

### Rede / Conectividade

O Oracle on-premises precisa ser acessível pela Confluent Cloud:

| Opção | Como | Latência |
|-------|------|---------|
| **Confluent Cloud Private Link** | VPN/ExpressRoute + Private Link | Baixa |
| **Confluent Cloud Peering** | VPC/VNet peering | Baixa |
| **Internet (TLS)** | Endpoint público com TLS + IP allowlist | Média |

> Para produção, recomenda-se cluster **Enterprise** (suporta Private Link/Peering)
> ou **Dedicated** para máximo isolamento.

### Fluxo de dados detalhado

```
1. Oracle Legado
   │ XStream Out Server (configurado no Oracle)
   │ captura LCRs (Logical Change Records) dos redo logs
   │
2. Confluent XStream CDC Source Connector
   │ recebe LCRs, converte para Avro/JSON
   │ publica em topics: ecad.legado.tb_associacao, ecad.legado.tb_titular, etc.
   │
3. Flink SQL (serverless)
   │ SELECT com renomeação, CASE para enums, filtro de colunas
   │ publica em topics: MCAD_ASSOCIACOES, MCAD_TITULARES, etc.
   │
4. Oracle JDBC Sink Connector
   │ consome topics MCAD_*, escreve em cdc_staging.*
   │ modo UPSERT (idempotente) com chave = codigo
   │
5. PL/SQL Procedure sync_to_cadastro()
   │ resolve FKs codigo→UUID via JOIN
   │ insere/atualiza em schema cadastro.*
```

### Transformações no Flink SQL

```sql
-- Exemplo: TB_TITULAR → MCAD_TITULARES
CREATE TABLE MCAD_TITULARES AS
SELECT
    CD_TITULAR           AS codigo,
    NM_TITULAR           AS nome,
    CASE NR_TIPO_PESSOA
        WHEN 1 THEN 'PF'
        WHEN 2 THEN 'PJ'
    END                  AS tipo,
    NR_CPF               AS cpf,
    NR_CNPJ              AS cnpj,
    NM_NACIONALIDADE     AS nacionalidade,
    NR_CAE_IPI           AS cae_ipi,
    CD_ASSOCIACAO        AS associacao_codigo,
    CASE NR_STATUS
        WHEN 1 THEN 'ATIVO'
        WHEN 2 THEN 'FALECIDO'
        WHEN 3 THEN 'TRANSFERINDO'
    END                  AS status,
    DT_CADASTRO          AS criado_em,
    DT_ALTERACAO         AS atualizado_em
FROM `ecad.legado.tb_titular`;
-- Colunas NM_ASSOCIACAO, SG_ASSOCIACAO, NR_CONTA_BANCO, NR_AGENCIA, CD_BANCO
-- sao implicitamente dropadas (nao listadas no SELECT)
```

### Vantagens

- **Zero infra para gerenciar** — sem Kafka brokers, Connect workers, Schema Registry
- **XStream sem licença GG** — performance de GoldenGate, custo de subscription
- **Flink SQL serverless** — transformações ricas (JOINs, windowing, agregações)
- **Multi-consumer nativo** — qualquer sistema pode consumir os topics Kafka
- **Replay** — retenção configurável, reprocessamento de eventos
- **Observabilidade completa** — Console, Data Portal, Stream Lineage, métricas
- **Inversão de fluxo** — reconfigura connectors (source ↔ sink), sem reinstalar nada
- **Schema evolution** — Schema Registry com Avro gerencia evolução automática
- **Ecossistema** — 70+ connectors se precisar expandir para outros targets

### Desvantagens

- **Dependência de cloud** — Oracle on-premises precisa de conectividade com Confluent Cloud
- **Latência** — XStream: ~1-3s end-to-end (vs sub-segundo do GoldenGate direto)
- **Custo recorrente** — subscription mensal vs licença perpétua do GG
- **Sem bidirectional nativo** — inversão de fluxo requer reconfiguração, não há CDR
- **Vendor lock-in Confluent** — connectors premium são proprietários
- **Complexidade de rede** — Private Link/Peering para conectar on-premises ao cloud

### Quando escolher

- Equipe quer **zero operação de infraestrutura** de CDC
- Há planos de usar Kafka como event bus permanente pós-migração
- Latência de 1-3 segundos é aceitável
- Orçamento para subscription recorrente está disponível
- Conectividade cloud ↔ on-premises já existe ou é viável

---

## Opção E — Confluent Platform Self-Managed + XStream

**Premissa**: Mesmo stack da Opção D, mas rodando on-premises ou em VMs próprias
via Confluent Platform (self-managed). Elimina a dependência de conectividade cloud.

```
┌──────────────────────┐
│   Oracle (Legado)    │
│   (on-premises)      │
│                      │
│  ecad_legado schema  │       ┌──────────────────────────────────────────────────┐
│  ┌────────────────┐  │       │     Confluent Platform (on-premises / VMs)       │
│  │ TB_ASSOCIACAO   │  │       │                                                  │
│  │ TB_TITULAR      │  │       │  ┌──────────────────┐   ┌────────────────┐      │
│  │ TB_OBRA         │──┼──────▶│  │ Oracle XStream   │──▶│ Topics (raw)   │      │
│  │ TB_TITULARIDADE │  │       │  │ CDC Source        │   └───────┬────────┘      │
│  │ TB_FONOGRAMA    │  │       │  └──────────────────┘           │               │
│  │ TB_PARTICIPACAO │  │       │                          ┌──────▼───────┐        │
│  │ TB_HIST_BLOQ    │  │       │                          │ ksqlDB /     │        │
│  └────────────────┘  │       │                          │ Flink (self) │        │
└──────────────────────┘       │                          └──────┬───────┘        │
                                │                          ┌─────▼──────────┐      │
                                │                          │ Topics (MCAD_*)│      │
                                │                          └──────┬─────────┘      │
                                │                          ┌──────▼───────┐        │
                                │                          │ Oracle JDBC  │        │
                                │                          │ Sink          │        │
                                │                          └──────┬───────┘        │
                                │                                 │                │
                                │  ┌──────────────────┐           │                │
                                │  │ Control Center   │           │                │
                                │  │ (monitoring)     │           │                │
                                │  └──────────────────┘           │                │
                                └─────────────────────────────────┼────────────────┘
                                                                  │
                                                     ┌────────────▼─────────┐
                                                     │   Oracle (mcad)      │
                                                     │   (on-premises)      │
                                                     │                      │
                                                     │  cdc_staging         │
                                                     │    ↓ PROCEDURE       │
                                                     │  cadastro            │
                                                     └──────────────────────┘
```

### Componentes

| Componente | Server/VM | Porta | Imagem/Pacote |
|-----------|-----------|-------|---------------|
| Kafka (KRaft) | kafka-1, kafka-2, kafka-3 | 9092 | confluent-server (RPM/DEB) |
| Schema Registry | schema-registry | 8081 | confluent-schema-registry |
| Kafka Connect + XStream CDC | connect-1 | 8083 | confluent-kafka-connect + oracle-xstream-cdc-source |
| ksqlDB (ou Flink self-managed) | ksqldb-1 | 8088 | confluent-ksqldb-server |
| Control Center | control-center | 9021 | confluent-control-center |
| Oracle JDBC Sink | connect-1 | 8083 | (mesmo Connect cluster) |

### Vantagens

- **On-premises** — sem dependência de cloud, dados não saem do datacenter
- **XStream sem licença GG** — mesmo benefício da Opção D
- **Controle total** — tuning de Kafka, brokers, retenção, particionamento
- **Baixa latência** — tudo na mesma rede, sem hops cloud
- **Control Center** — UI de monitoramento enterprise

### Desvantagens

- **Operação pesada** — Kafka brokers, Connect workers, ksqlDB, Schema Registry
- **Custo de subscription** — Confluent Platform Enterprise license ($150K-$450K/ano)
- **Custo de infra** — VMs/servidores dedicados para o cluster Kafka
- **Expertise Kafka** — equipe precisa operar Kafka em produção
- **Sem Flink SQL serverless** — usa ksqlDB ou Flink self-managed
- **Scaling manual** — sem auto-scaling como Confluent Cloud

### Quando escolher

- **Dados não podem sair do datacenter** (compliance, regulatório)
- Latência mínima é requisito (tudo on-premises, mesma rede)
- Equipe tem ou está disposta a construir expertise Kafka
- Já há infraestrutura de VMs disponível

---

## Opção F — GoldenGate + Confluent Cloud (Hybrid)

**Premissa**: GoldenGate Standard (que já temos) faz a replicação Oracle-to-Oracle
no path principal. Confluent Cloud entra como **event bus** consumindo do Oracle mcad
via XStream CDC connector. Combina a velocidade do GG com o ecossistema Kafka.

```
┌──────────────────────┐                              ┌──────────────────────┐
│   Oracle (Legado)    │      Oracle GoldenGate       │   Oracle (mcad)      │
│                      │      (Standard — já temos)    │                      │
│  ecad_legado schema  │  ┌───────────────────────┐   │  ┌────────────────┐  │
│  ┌────────────────┐  │  │                       │   │  │ cdc_staging    │  │
│  │ TB_ASSOCIACAO   │  │  │  Extract ──▶ Pump    │   │  │                │  │
│  │ TB_TITULAR      │──┼─▶│          ──▶ Replicat│──▶│  └───────┬────────┘  │
│  │ TB_OBRA         │  │  │  (sub-segundo)       │   │          │ PROCEDURE │
│  │ TB_TITULARIDADE │  │  └───────────────────────┘   │  ┌───────▼────────┐  │
│  │ TB_FONOGRAMA    │  │                              │  │ cadastro       │  │
│  │ TB_PARTICIPACAO │  │                              │  │ (final, UUIDs) │  │
│  │ TB_HIST_BLOQ    │  │                              │  └───────┬────────┘  │
│  └────────────────┘  │                              └──────────┼───────────┘
└──────────────────────┘                                         │
                                                                 │ Confluent
                                                                 │ XStream CDC
                                                                 │ Source
                               ┌─────────────────────────────────▼────────────┐
                               │           Confluent Cloud                     │
                               │                                               │
                               │  ┌──────────────────┐   ┌────────────────┐   │
                               │  │ Oracle XStream   │──▶│ Topics         │   │
                               │  │ CDC Source        │   │ mcad.cadastro.*│   │
                               │  │ (managed)        │   └───────┬────────┘   │
                               │  └──────────────────┘           │            │
                               │                          ┌──────▼───────┐    │
                               │                          │ Consumer A   │    │
                               │                          │ (analytics)  │    │
                               │                          └──────────────┘    │
                               │                          ┌──────────────┐    │
                               │                          │ Consumer B   │    │
                               │                          │ (auditoria)  │    │
                               │                          └──────────────┘    │
                               │                          ┌──────────────┐    │
                               │                          │ Tableflow    │    │
                               │                          │ (Iceberg)    │    │
                               │                          └──────────────┘    │
                               └───────────────────────────────────────────────┘
```

### Como funciona

1. **GoldenGate** replica Legado → mcad (path principal, sub-segundo)
2. **PL/SQL procedure** resolve FKs no banco destino
3. **Confluent XStream CDC** lê do Oracle mcad (schema `cadastro` — dados já com UUIDs)
4. **Confluent Cloud** distribui eventos para consumers (analytics, auditoria, etc.)

### Vantagens

- **Melhor dos dois mundos** — GG para velocidade, Confluent para distribuição
- **Sem licença adicional de GG** — GG Standard (já temos) + Confluent subscription
- **XStream no mcad sem licença GG** — Confluent bundle cobre o XStream
- **Path principal não depende de Kafka** — falha no Confluent não afeta replicação
- **Dados já transformados no Kafka** — consumers recebem UUIDs, enums resolvidos
- **Ecossistema completo** — Stream Governance, Tableflow, 70+ connectors

### Desvantagens

- **Dois mecanismos de CDC** — GG no legado, Confluent XStream no mcad
- **Custo duplo** — suporte GG + subscription Confluent
- **Complexidade operacional** — administrar GG + Confluent
- **Latência no Kafka** — eventos no Confluent Cloud chegam após GG + procedure + XStream
- **Conectividade cloud** — Oracle mcad precisa acessar Confluent Cloud

### Quando escolher

- GoldenGate já existe e funciona — não há razão para substituí-lo
- Há demanda real de event bus (analytics, auditoria, outros serviços)
- Equipe quer investir em Kafka como plataforma, não apenas para CDC

---

## Matriz de Decisão (v3 — inclui todas as opções viáveis)

| Critério | Peso | A (GG Direto) | D (Confluent Cloud) | E (Confluent Self) | F (GG+Confluent) |
|----------|------|:-:|:-:|:-:|:-:|
| Latência de replicação | Alto | **5** | 3 | 4 | **5** |
| Simplicidade operacional | Alto | 4 | **5** | 1 | 2 |
| Multi-consumer / event bus | Médio | 1 | **5** | **5** | 4 |
| Observabilidade | Médio | 2 | **5** | 4 | 4 |
| Riqueza de transformação | Médio | 2 | **5** | 4 | 3 |
| Custo total (3 anos) | Alto | **5** | 3 | 1 | 2 |
| Inversão de fluxo | Alto | **5** | 4 | 4 | 4 |
| Replay / reprocessamento | Baixo | 1 | **5** | **5** | 4 |
| Dados on-premises | Médio | **5** | 2 | **5** | 3 |
| Schema evolution | Baixo | 1 | **5** | **5** | **5** |
| Path para event streaming | Médio | 1 | **5** | **5** | 4 |
| Expertise existente | Médio | 3 (GG) | 4 (managed) | 2 (Kafka ops) | 2 (GG+Kafka) |
| **Score ponderado** | | **~3.4** | **~4.0** | **~3.3** | **~3.3** |

> **Nota**: Opção A ganha em custo e simplicidade.
> Opção D ganha em features e operação, mas tem custo recorrente.
> A escolha depende de: (1) migração é finita ou permanente? (2) há budget para subscription?

---

## Comparativo Consolidado: GoldenGate vs Confluent XStream

| Aspecto | GoldenGate Standard | Confluent XStream CDC |
|---------|--------------------|-----------------------|
| Tecnologia de captura | Redo log (proprietário) | XStream Out API (mesma engine do GG) |
| Latência | Sub-segundo | 1-3 segundos |
| Throughput | 100K+ rows/sec | 2-3x melhor que LogMiner |
| Overhead no source Oracle | Baixo | Baixo-moderado (XStream server no Oracle) |
| Licença Oracle adicional | GG Standard (já temos) | **Nenhuma** (bundled no Confluent) |
| Transformação | COLMAP, @IF, @CASE | Flink SQL (JOINs, windowing, agregações) |
| Event bus | Nao | Kafka nativo |
| Bidirectional | Sim (com CDR) | Nao nativo |
| Gerenciamento | Auto-gerenciado (GGSCI) | Fully managed (Cloud) ou self-managed |
| DDL replication | Sim | Limitado |
| Multi-target | Oracle-to-Oracle (Standard) | Qualquer (70+ connectors) |
| Inversão de fluxo | Trocar Extract/Replicat | Reconfigurar connectors |

---

## Recomendação v3

### Cenário 1: Migração é evento finito, sem necessidade de event bus

**→ Opção A (GoldenGate Direto)** — da v2

Razão: menor custo, menor complexidade, licença já existe. Confluent é over-engineering
para um pipeline temporário. Após cutover, desliga o GoldenGate.

### Cenário 2: Migração + event bus permanente, com budget para cloud

**→ Opção D (Confluent Cloud End-to-End)**

Razão: substitui tanto o GoldenGate quanto o Kafka/ksqlDB da v1 por uma solução
fully managed. XStream CDC dá performance comparável ao GG. Flink SQL supera
ksqlDB. Zero operação de infraestrutura. O custo recorrente se justifica
se o Kafka vira plataforma de eventos da organização.

### Cenário 3: Event bus necessário, mas dados não podem sair do datacenter

**→ Opção E (Confluent Platform Self-Managed)**

Razão: mesmo ecossistema da Opção D, on-premises. Trade-off pesado em operação
e custo de subscription. Só faz sentido se compliance exige dados on-premises.

### Cenário 4: GoldenGate já funciona, mas precisamos de event bus

**→ Opção F (GoldenGate + Confluent Cloud Hybrid)**

Razão: preserva o investimento em GG para replicação (sub-segundo) e adiciona
Confluent como event bus. Mais complexo, mas não desperdiça o GG existente.

---

## Impacto na POC

| Aspecto | POC v1 | POC v2 (GG) | POC v3 (Confluent) |
|---------|--------|-------------|---------------------|
| Source DB | PG + Debezium | Oracle XE + GG Free | Oracle XE + Confluent CDC |
| CDC capture | Debezium PG | GG Extract | **Confluent XStream CDC** |
| Transformação | ksqlDB | GG COLMAP | **Flink SQL** |
| Transport | Kafka (Docker) | Opcional | **Confluent Cloud** (ou Docker local) |
| Target DB | PostgreSQL | Oracle XE | Oracle XE |
| Staging → Final | PG Procedure | PL/SQL Procedure | PL/SQL Procedure |
| Infra local | ~8 containers | ~3 containers | **0 containers** (Cloud) ou ~6 (local) |

### POC com Confluent Cloud

Confluent oferece **$400 em créditos gratuitos** para novos clientes. Com isso
é possível rodar a POC inteira na cloud por algumas semanas:

1. Criar cluster Basic/Standard na Confluent Cloud
2. Configurar Oracle XStream CDC Source apontando para Oracle on-prem
3. Criar transformações Flink SQL via SQL Workspace
4. Configurar Oracle JDBC Sink para o Oracle mcad
5. Monitorar via Console + Stream Lineage

### POC local (Confluent Platform)

Alternativamente, Confluent Platform tem trial de 30 dias:

```bash
# Docker Compose com Confluent Platform
docker compose -f docker-compose.confluent.yml up -d
# Inclui: kafka, schema-registry, connect (com oracle-xstream-cdc), ksqldb, control-center
```

## Estratégia de Chave: `codigo`

(Sem alteração — agnóstica ao mecanismo de CDC)

| Camada | PK | Chave de negócio | FKs |
|--------|-----|-------------------|-----|
| Legado | CD_* (INTEGER) | = PK | CD_* (INTEGER) |
| cdc_staging | codigo (INTEGER) | = PK | *_codigo (INTEGER) |
| cadastro | id (UUID) | codigo (INTEGER, UNIQUE) | *_id (UUID) |

## Decisões v3

| Decisão | v1 | v2 | v3 (se Confluent) |
|---------|----|----|-------------------|
| CDC capture | Debezium | GoldenGate | **Confluent XStream CDC** |
| Licença Oracle extra | Nenhuma | GG Standard | **Nenhuma** (bundled) |
| Transformação | ksqlDB | GG COLMAP | **Flink SQL** |
| Transport | Kafka (obrigatório) | Depende da opção | **Kafka** (Confluent Cloud) |
| Schema management | JSON converters | — | **Avro + Schema Registry** |
| Operação de infra | Auto-gerenciada | Auto-gerenciada | **Fully managed** (Opção D) |
| Observabilidade | Kafka UI | GG Enterprise Manager | **Console + Lineage + Catalog** |
| Chave de mapeamento | `codigo` | `codigo` | `codigo` (sem mudança) |
| Resolução de FK | PG Procedure | PL/SQL | PL/SQL (sem mudança) |

## Próximos Passos

1. **Avaliar custo Confluent Cloud** — solicitar estimativa com base no volume de dados do legado
2. **Testar conectividade** — validar acesso Oracle on-premises ↔ Confluent Cloud
3. **POC com créditos gratuitos** — usar $400 de créditos para validar XStream CDC + Flink SQL
4. **Comparar latência** — medir GG direto (v2 Opção A) vs Confluent XStream (v3 Opção D)
5. **Decidir entre opções** — A (GG) se migração finita, D (Confluent) se event bus permanente
