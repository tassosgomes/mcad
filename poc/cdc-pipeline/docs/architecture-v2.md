# POC CDC Pipeline — Arquitetura v2 (com Oracle GoldenGate)

## Contexto

Validação da arquitetura de **dupla convivência** para migração do ECAD legado.
O fluxo é **unidirecional** com inversão no cutover:

```
Fase 1 (migração):  Legado (R/W) ──CDC──▶ mcad (R/O)
Fase 2 (cutover):   mcad (R/W) ──CDC──▶ Legado (R/O)
```

### Mudança em relação à v1

A equipe confirmou a disponibilidade do **Oracle GoldenGate** (licenciado).
Isso abre três arquiteturas candidatas, cada uma com trade-offs distintos
em complexidade, latência, e aderência ao stack existente.

---

## Opção A — GoldenGate Direto (Oracle-to-Oracle)

**Premissa**: GoldenGate faz captura e replicação ponto-a-ponto, sem intermediários.

```
┌──────────────────────┐                              ┌──────────────────────┐
│   Oracle (Legado)    │                              │   Oracle (mcad)      │
│                      │                              │                      │
│  ecad_legado schema  │      Oracle GoldenGate       │  ┌────────────────┐  │
│  ┌────────────────┐  │  ┌───────────────────────┐   │  │ cdc_staging    │  │
│  │ TB_ASSOCIACAO   │  │  │                       │   │  │ (flat, codigos)│  │
│  │ TB_TITULAR      │──┼─▶│  Extract  ──▶  Pump  │──▶│  └───────┬────────┘  │
│  │ TB_OBRA         │  │  │           ──▶ Replicat│   │          │ PROCEDURE │
│  │ TB_TITULARIDADE │  │  │                       │   │          │ resolve   │
│  │ TB_FONOGRAMA    │  │  │  (MAP com filtering   │   │          │ FKs UUID  │
│  │ TB_PARTICIPACAO │  │  │   e column mapping)   │   │  ┌───────▼────────┐  │
│  │ TB_HIST_BLOQ    │  │  └───────────────────────┘   │  │ cadastro       │  │
│  └────────────────┘  │                              │  │ (final, UUIDs) │  │
└──────────────────────┘                              └──────────────────────┘
```

### Componentes

| Componente | Onde roda | Função |
|-----------|-----------|--------|
| GG Extract | Server legado | Captura redo logs do Oracle source |
| GG Pump (Data Pump) | Server legado | Transmite trail files para o target |
| GG Replicat | Server mcad | Aplica no Oracle destino com MAP/FILTER |
| Procedure PG/Oracle | Oracle mcad | Resolve FK codigo→UUID (igual v1) |

### Transformações no GoldenGate

O Replicat suporta `MAP` com `COLMAP` e `FILTER`:

```
-- Exemplo: TB_TITULAR → staging.titulares
MAP ecad_legado.tb_titular, TARGET cdc_staging.titulares,
  COLMAP (
    codigo     = CD_TITULAR,
    nome       = NM_TITULAR,
    tipo       = @IF(NR_TIPO_PESSOA = 1, 'PF', 'PJ'),
    cpf        = NR_CPF,
    cnpj       = NR_CNPJ,
    nacionalidade = NM_NACIONALIDADE,
    cae_ipi    = NR_CAE_IPI,
    associacao_codigo = CD_ASSOCIACAO,
    status     = @CASE(NR_STATUS, 1, 'ATIVO', 2, 'FALECIDO', 3, 'TRANSFERINDO'),
    criado_em  = DT_CADASTRO,
    atualizado_em = DT_ALTERACAO
  ),
  FILTER (@EXCLUDE (NM_ASSOCIACAO, SG_ASSOCIACAO, NR_CONTA_BANCO, NR_AGENCIA, CD_BANCO));
```

### Vantagens

- **Menor latência** — replicação direta, sem hops intermediários
- **Menor footprint** — sem Kafka, Schema Registry, ksqlDB, Connect
- **Nativo Oracle** — suporte enterprise, redo log capture (não LogMiner)
- **Inversão de fluxo simples** — apenas trocar Extract/Replicat de lado
- **Transformações inline** — COLMAP, FILTER, @IF, @CASE cobrem o mapeamento
- **Monitoramento integrado** — GoldenGate Management Pack no Oracle EM

### Desvantagens

- **Sem event bus** — outros consumers não recebem eventos de mudança
- **Sem replay** — trail files são transientes (retenção limitada)
- **Vendor lock-in Oracle** — toda a pipeline é proprietária
- **Sem visibilidade stream** — não há UI para inspecionar mensagens em trânsito
- **Transformações limitadas** — sem JOINs cross-table, sem agregações, sem windowing

### Quando escolher

- Time-to-value é prioridade máxima
- Não há necessidade de outros consumers além do mcad
- Equipe já tem expertise em GoldenGate
- Migração é um evento finito (a pipeline será desligada após cutover)

---

## Opção B — GoldenGate + Kafka (Hybrid)

**Premissa**: GoldenGate captura do Oracle com alta fidelidade, publica em Kafka
para transformação e distribuição. Usa GoldenGate for Big Data (GG4BD) ou
GoldenGate Kafka Handler.

```
┌──────────────────────┐
│   Oracle (Legado)    │
│                      │
│  ecad_legado schema  │
│  ┌────────────────┐  │       ┌──────────────────────────────────────────────────┐
│  │ TB_ASSOCIACAO   │  │       │              Kafka Ecosystem                     │
│  │ TB_TITULAR      │  │       │                                                  │
│  │ TB_OBRA         │  │       │  ┌─────────────────┐   ┌────────┐               │
│  │ TB_TITULARIDADE │──┼──────▶│  │ GG Kafka Handler│──▶│ Topics │               │
│  │ TB_FONOGRAMA    │  │       │  │ (ou GG4BD)      │   │ (raw)  │               │
│  │ TB_PARTICIPACAO │  │       │  └─────────────────┘   └───┬────┘               │
│  │ TB_HIST_BLOQ    │  │       │                            │                    │
│  └────────────────┘  │       │                     ┌──────▼───────┐             │
└──────────────────────┘       │                     │ Flink SQL /  │             │
                                │                     │ ksqlDB       │             │
                                │                     │ Transform    │             │
                                │                     └──────┬───────┘             │
                                │                            │                    │
                                │                     ┌──────▼───────┐             │
                                │                     │ Topics       │             │
                                │                     │ (MCAD_*)     │             │
                                │                     └──────┬───────┘             │
                                │                            │     ┌────────────┐ │
                                │                            │     │ Consumer B │ │
                                │                            │     │ (analytics)│ │
                                │                     ┌──────▼──┐  └────────────┘ │
                                │                     │JDBC Sink│                  │
                                │                     └────┬────┘                  │
                                └──────────────────────────┼──────────────────────┘
                                                           │
                                              ┌────────────▼─────────┐
                                              │   Oracle (mcad)      │
                                              │                      │
                                              │  ┌────────────────┐  │
                                              │  │ cdc_staging    │  │
                                              │  └───────┬────────┘  │
                                              │          │ PROCEDURE │
                                              │  ┌───────▼────────┐  │
                                              │  │ cadastro       │  │
                                              │  │ (final, UUIDs) │  │
                                              │  └────────────────┘  │
                                              └──────────────────────┘
```

### Componentes

| Componente | Container/Server | Porta | Função |
|-----------|-----------|-------|--------|
| GG Extract | Server legado | — | Captura redo logs |
| GG Pump | Server legado | — | Transmite trail files |
| GG Kafka Handler | cdc-kafka-connect ou GG server | — | Publica em Kafka topics |
| Kafka (KRaft) | cdc-kafka | 9092 | Event bus |
| Schema Registry | cdc-schema-registry | 8081 | Avro schemas |
| Flink SQL / ksqlDB | cdc-flink / cdc-ksqldb | 8088 | Transformação |
| JDBC Sink | cdc-kafka-connect | 8083 | Escrita no target |
| Kafka UI | cdc-kafka-ui | 8080 | Observabilidade |

### Vantagens

- **Melhor dos dois mundos** — captura enterprise + event bus distribuído
- **Multi-consumer** — analytics, auditoria, outros serviços podem consumir
- **Replay** — Kafka retém eventos por período configurável
- **Transformações ricas** — Flink SQL/ksqlDB fazem JOINs, windowing, agregações
- **Observabilidade** — Kafka UI, métricas Prometheus, lag monitoring
- **Flexibilidade no target** — JDBC Sink pode escrever em qualquer RDBMS
- **Path para Confluent Cloud** — upgrade natural se migrar para cloud

### Desvantagens

- **Maior complexidade** — mais componentes para operar e monitorar
- **Latência adicional** — GG → Kafka → Transform → Sink (3-4 hops)
- **Custo de licença duplo** — GoldenGate + Kafka/Confluent
- **Dois paradigmas de CDC** — GoldenGate trail files + Kafka topics
- **GG Kafka Handler** — requer configuração não trivial (formato Avro/JSON, schema)

### Quando escolher

- Outros sistemas precisam consumir os eventos de mudança
- Há planos de manter a pipeline como event bus permanente pós-migração
- A equipe quer investir em streaming platform (Kafka/Flink) para outros use-cases
- Observabilidade granular é requisito

---

## Opção C — GoldenGate Puro com Event Tap

**Premissa**: GoldenGate faz a replicação direta (como Opção A), mas um Extract
secundário publica em Kafka apenas para **observabilidade e consumers auxiliares**.

```
┌──────────────────────┐
│   Oracle (Legado)    │
│                      │
│  ecad_legado schema  │
│  ┌────────────────┐  │
│  │ TB_ASSOCIACAO   │  │
│  │ TB_TITULAR      │  │      ┌────────────────────────────┐
│  │ TB_OBRA         │──┼─────▶│ GG Extract (primary)       │
│  │ TB_TITULARIDADE │  │      │  ├─▶ Pump ──▶ Replicat ────┼──────────────┐
│  │ TB_FONOGRAMA    │  │      │  │   (replicação direta)    │              │
│  │ TB_PARTICIPACAO │  │      │  │                          │              │
│  │ TB_HIST_BLOQ    │  │      │  └─▶ Kafka Handler ─────┐  │              │
│  └────────────────┘  │      │      (event tap, async)  │  │              │
└──────────────────────┘      └──────────────────────┼───┘              │
                                                      │                   │
                                         ┌────────────▼────┐   ┌────────▼──────────┐
                                         │  Kafka (eventos │   │  Oracle (mcad)     │
                                         │  para analytics,│   │                    │
                                         │  auditoria,     │   │  cdc_staging       │
                                         │  monitoring)    │   │    ↓ PROCEDURE     │
                                         └─────────────────┘   │  cadastro          │
                                                               └───────────────────┘
```

### Vantagens

- **Latência mínima no path crítico** — replicação direta GG, sem Kafka no caminho
- **Event bus disponível** — consumers secundários via Kafka tap
- **Desacoplamento** — falha no Kafka não afeta a replicação principal
- **Simplicidade operacional** — Kafka é "nice to have", não "must have"

### Desvantagens

- **Transformação duplicada** — GG COLMAP para replicação + schema Kafka separado
- **Dois pipelines para manter** — primary + tap
- **Kafka subutilizado** — overhead de infra para um tap secundário

### Quando escolher

- Replicação é o requisito primário, mas há demanda secundária de eventos
- Equipe quer migrar rápido (GG direto) mas não quer perder visibilidade

---

## Matriz de Decisão

| Critério | Peso | A (GG Direto) | B (GG+Kafka) | C (GG+Tap) |
|----------|------|:-:|:-:|:-:|
| Latência de replicação | Alto | 5 | 3 | 5 |
| Simplicidade operacional | Alto | 5 | 2 | 3 |
| Multi-consumer / event bus | Médio | 1 | 5 | 3 |
| Observabilidade do fluxo | Médio | 2 | 5 | 4 |
| Riqueza de transformação | Médio | 3 | 5 | 3 |
| Custo de infraestrutura | Médio | 5 | 2 | 3 |
| Inversão de fluxo (cutover) | Alto | 5 | 3 | 4 |
| Replay / reprocessamento | Baixo | 1 | 5 | 3 |
| Path para produção | Alto | 4 | 4 | 4 |
| Expertise necessária | Médio | 3 (GG) | 2 (GG+Kafka) | 3 (GG) |
| **Score ponderado** | | **~3.8** | **~3.4** | **~3.6** |

> **Nota**: Os scores são indicativos. O peso real depende do contexto do time.

## Recomendação

### Se a migração é um evento finito (pipeline desligada após cutover):

**→ Opção A (GoldenGate Direto)**

Razão: menor complexidade, menor latência, menor custo operacional. A pipeline
existe apenas para migrar — não precisa de event bus permanente. GoldenGate resolve
o CDC de Oracle-to-Oracle nativamente, incluindo a inversão de fluxo.

### Se a pipeline vai evoluir para event streaming permanente:

**→ Opção B (GoldenGate + Kafka)**

Razão: o investimento em Kafka/Flink se paga ao longo do tempo. A captura via
GoldenGate é mais robusta que Debezium para Oracle, e o Kafka serve como
backbone de eventos para além da migração.

### Se há incerteza sobre o futuro:

**→ Opção C (GoldenGate + Event Tap)**

Razão: começa simples (Opção A) com a porta aberta para evolução. O Kafka tap
pode ser promovido a path principal se a demanda surgir.

---

## Impacto na POC

A POC atual usa PostgreSQL simulando Oracle. Com GoldenGate confirmado:

| Aspecto | POC v1 (atual) | POC v2 (recomendado) |
|---------|---------------|---------------------|
| Source DB | PostgreSQL + Debezium | **Oracle XE 21c + GoldenGate Free** |
| CDC capture | Debezium PG connector | **GG Extract + redo log** |
| Transformação | ksqlDB | **GG COLMAP** (Opção A/C) ou **Flink SQL** (Opção B) |
| Transport | Kafka obrigatório | **Opcional** (depende da opção) |
| Target DB | PostgreSQL | **Oracle XE 21c** (mais realista) |
| Staging → Final | PG Procedure | **PL/SQL Procedure** (idem lógica) |

### GoldenGate Free (desde 2023)

Oracle disponibiliza **GoldenGate Free** (23ai) para Oracle DB — sem custo de
licença para bancos Oracle. Isso viabiliza a POC sem custo adicional:

```
# Docker image oficial
container-registry.oracle.com/goldengate/goldengate-free:23
```

## Estratégia de Chave: `codigo`

(Sem alteração em relação à v1 — a estratégia de chave é agnóstica ao mecanismo de CDC)

O campo `codigo` (INTEGER) do legado é uma **entidade de negócio** — os setores usam
"Obra 5001", "Titular 1003" no dia a dia. Por isso ele é preservado no mcad.

| Camada | PK | Chave de negócio | FKs |
|--------|-----|-------------------|-----|
| Legado | CD_* (INTEGER) | = PK | CD_* (INTEGER) |
| cdc_staging | codigo (INTEGER) | = PK | *_codigo (INTEGER) |
| cadastro | id (UUID) | codigo (INTEGER, UNIQUE) | *_id (UUID) |

### Fluxo de resolução de FK

```
Legado: TB_TITULAR.CD_ASSOCIACAO = 1
   ↓ GG COLMAP (ou ksqlDB/Flink, conforme opção)
Staging: titulares.associacao_codigo = 1
   ↓ PL/SQL PROCEDURE sync_to_cadastro()
Cadastro: titulares.associacao_id = (SELECT id FROM associacoes WHERE codigo = 1)
```

### Continuidade pós-migração (Opção A — Sequence)

Sem alteração — quando o mcad passar a ser R/W (Fase 2), as sequences são ajustadas:

```sql
CALL cdc_staging.adjust_sequences();
-- Cria/ajusta: cadastro.seq_titular_codigo = MAX(codigo) + 1
```

## Componentes por Opção

### Opção A — GoldenGate Direto

| Componente | Onde | Função |
|-----------|------|--------|
| Oracle XE (legado) | cdc-oracle-legado:1521 | Source |
| Oracle XE (mcad) | cdc-oracle-mcad:1522 | Target |
| GoldenGate Free | cdc-goldengate:443 | Extract + Replicat |

### Opção B — GoldenGate + Kafka

| Componente | Container | Porta | Imagem |
|-----------|-----------|-------|--------|
| Oracle XE (legado) | cdc-oracle-legado | 1521 | gvenzl/oracle-xe:21-slim |
| GoldenGate Free | cdc-goldengate | 443 | oracle/goldengate-free:23 |
| Kafka (KRaft) | cdc-kafka | 9092 | confluentinc/cp-kafka:7.7.1 |
| Schema Registry | cdc-schema-registry | 8081 | confluentinc/cp-schema-registry:7.7.1 |
| Flink SQL | cdc-flink | 8081 | flink:1.19 |
| Kafka Connect (JDBC Sink) | cdc-kafka-connect | 8083 | confluentinc/cp-kafka-connect:7.7.1 |
| Kafka UI | cdc-kafka-ui | 8080 | provectuslabs/kafka-ui:v0.7.2 |
| Oracle XE (mcad) | cdc-oracle-mcad | 1522 | gvenzl/oracle-xe:21-slim |

### Opção C — GoldenGate + Event Tap

| Componente | Onde | Função |
|-----------|------|--------|
| Oracle XE (legado) | cdc-oracle-legado:1521 | Source |
| Oracle XE (mcad) | cdc-oracle-mcad:1522 | Target |
| GoldenGate Free | cdc-goldengate:443 | Extract + Replicat (primary) |
| GG Kafka Handler | cdc-goldengate | Kafka tap (secondary) |
| Kafka (KRaft) | cdc-kafka:9092 | Event bus (observabilidade) |
| Kafka UI | cdc-kafka-ui:8080 | Visualização |

## Decisões (atualização v2)

| Decisão | v1 | v2 (recomendação) | Motivo |
|---------|----|--------------------|--------|
| CDC capture | Debezium | **GoldenGate** | Licenciado, nativo Oracle, redo log capture |
| Chave de mapeamento | `codigo` | `codigo` (sem mudança) | É entidade de negócio |
| Resolução de FK | Staging + Procedure PG | **Staging + PL/SQL** | Idem lógica, Oracle nativo |
| Fluxo | Unidirecional | Unidirecional (sem mudança) | Simplifica |
| Continuidade | Sequence | Sequence (sem mudança) | Sem conflito |
| Transformação | ksqlDB | **GG COLMAP** (Opção A) ou **Flink SQL** (Opção B) | GG cobre o mapeamento; Flink se precisar de enriquecimento |
| Transport | Kafka (obrigatório) | **Depende da opção** | GG direto elimina necessidade |

## Substituições Futuras (atualização v2)

| POC v2 | Produção |
|--------|----------|
| Oracle XE 21c | Oracle Enterprise (prod) |
| GoldenGate Free 23 | GoldenGate Enterprise (licenciado) |
| Docker vanilla Kafka (se Opção B/C) | Confluent Cloud ou Oracle Streaming |
| Flink SQL local (se Opção B) | Flink no Confluent Cloud ou Oracle Cloud |
| gvenzl/oracle-xe images | Oracle RAC/Data Guard (prod) |

## Próximos Passos

1. **Decidir entre Opção A, B ou C** com base nos requisitos de evento
2. **Montar POC v2** com Oracle XE + GoldenGate Free em Docker
3. **Validar GG COLMAP** para as 7 tabelas do mapping-table
4. **Medir latência** de replicação end-to-end
5. **Testar inversão de fluxo** (cutover simulation)
