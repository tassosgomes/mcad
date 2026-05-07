# POC CDC Pipeline — Arquitetura

## Contexto

Validação da arquitetura de **dupla convivência** para migração do ECAD legado.
O fluxo é **unidirecional** com inversão no cutover:

```
Fase 1 (migração):  Legado (R/W) ──CDC──▶ mcad (R/O)
Fase 2 (cutover):   mcad (R/W) ──CDC──▶ Legado (R/O)
```

## Diagrama

```
┌──────────────────────┐
│   Oracle 1521        │
│   (simula Oracle)    │
│                      │
│  ecad_legado schema  │
│  ┌────────────────┐  │
│  │ TB_ASSOCIACAO   │ │
│  │ TB_TITULAR      │  │       ┌─────────────────────────────────────────────────┐
│  │ TB_OBRA         │──WAL──▶ │              Kafka Ecosystem                    │
│  │ TB_TITULARIDADE │  │       │                                                 │
│  │ TB_FONOGRAMA    │  │       │  ┌──────────┐    ┌────────┐    ┌────────────┐  │
│  │ TB_PARTICIPACAO │  │       │  │ Debezium │──▶│ Topics  │──▶│  ksqlDB    │  │
│  │ TB_HIST_BLOQ    │  │       │  │ Source   │    │ (raw)   │   │ Transform  │  │
│  └────────────────┘  │        │  └──────────┘    └────────┘    └─────┬──────┘  │
└──────────────────────┘       │                                       │         │
                                │                               ┌─────▼──────┐  │
                                │                               │  Topics    │  │
                                │                               │ (MCAD_*)   │  │
                                │                               └─────┬──────┘  │
                                │                                     │         │
                                │                               ┌─────▼──────┐  │
                                │                               │ JDBC Sink  │  │
                                │                               └─────┬──────┘  │
                                └─────────────────────────────────────┼─────────┘
                                                                      │
                                                         ┌────────────▼─────────┐
                                                         │   Oracle 1521        │
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

## Estratégia de Chave: `codigo`

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
   ↓ ksqlDB transform
Staging: titulares.associacao_codigo = 1
   ↓ PROCEDURE sync_to_cadastro()
Cadastro: titulares.associacao_id = (SELECT id FROM associacoes WHERE codigo = 1)
```

### Continuidade pós-migração (Opção A — Sequence)

Quando o mcad passar a ser R/W (Fase 2), as sequences são ajustadas:

```sql
CALL cdc_staging.adjust_sequences();
-- Cria/ajusta: cadastro.seq_titular_codigo = MAX(codigo) + 1
```

Novos registros no mcad recebem `codigo` sequencial automaticamente.
Sem conflito porque o fluxo é unidirecional — nunca ambos geram simultaneamente.

## Componentes

| Componente | Container | Porta | Imagem |
|-----------|-----------|-------|--------|
| Kafka (KRaft) | cdc-kafka | 9092 | confluentinc/cp-kafka:7.7.1 |
| Schema Registry | cdc-schema-registry | 8081 | confluentinc/cp-schema-registry:7.7.1 |
| Kafka Connect | cdc-kafka-connect | 8083 | confluentinc/cp-kafka-connect:7.7.1 |
| ksqlDB | cdc-ksqldb | 8088 | confluentinc/cp-ksqldb-server:7.7.1 |
| Kafka UI | cdc-kafka-ui | 8080 | provectuslabs/kafka-ui:v0.7.2 |
| PG Legado | cdc-postgres-legado | 5433 | postgres:16-alpine |

## Connectors

| Connector | Tipo | Topics | PK |
|-----------|------|--------|-----|
| ecad-legado-source | Debezium PG | ecad.ecad_legado.tb_* | — |
| mcad-sink-entidades | JDBC Sink | MCAD_ASSOCIACOES, _TITULARES, _OBRAS, _FONOGRAMAS, _HIST | codigo |
| mcad-sink-junctions | JDBC Sink | MCAD_TITULARIDADES, _PARTICIPACOES | PK composta |

## Decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Chave de mapeamento | `codigo` (INT do legado) | É entidade de negócio, não detalhe técnico |
| Resolução de FK | Staging + Procedure PG | JDBC Sink não faz lookup; PG resolve via JOIN |
| Fluxo | Unidirecional (sem duplex) | Simplifica — R/W em um lado só |
| Continuidade | Sequence (Opção A) | Sem conflito, ajusta MAX+1 no cutover |
| Transformação | ksqlDB | SQL-like, documentação madura |

## Substituições Futuras

| POC | Produção |
|-----|----------|
| PostgreSQL source | Oracle (LogMiner) |
| Docker vanilla Kafka | Confluent Cloud |
| ksqlDB | Flink SQL (Confluent Cloud) |
| PostgreSQL sink | Oracle (destino real) |
| JSON converters | Avro + Schema Registry |
