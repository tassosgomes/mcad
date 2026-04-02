# Modelagem de Banco de Dados — Schema `cadastro`

> **Database:** mcad | **Schema:** cadastro | **Host:** db.tasso.dev.br:5432
> **Extensão:** pg_trgm (trigram indexes para ILIKE)
> **Gerado em:** 2026-04-01

---

## Diagrama ER (Mermaid)

```mermaid
erDiagram
    associacoes {
        uuid Id PK
        varchar(200) Nome "NOT NULL"
        varchar(20) Sigla "UNIQUE, NOT NULL"
        char(18) Cnpj "UNIQUE, NOT NULL"
    }

    titulares {
        uuid Id PK
        varchar(200) Nome "NOT NULL"
        varchar(2) Tipo "CHECK: PF|PJ"
        varchar(11) Cpf "UNIQUE partial, NULL se PJ"
        varchar(14) Cnpj "UNIQUE partial, NULL se PF"
        varchar(100) Nacionalidade "NOT NULL"
        varchar(20) CaeIpi "NULL"
        uuid AssociacaoId FK "NOT NULL"
        varchar(15) Status "CHECK: ATIVO|FALECIDO|TRANSFERINDO"
        timestamptz CriadoEm "NOT NULL"
        timestamptz AtualizadoEm "NOT NULL"
    }

    obras_musicais {
        uuid Id PK
        varchar(300) Titulo "NOT NULL"
        varchar(300) Subtitulo "NULL"
        varchar(15) Tipo "CHECK: MUSICAL|LITEROMUSICAL|VERSAO|POT_POURRI"
        varchar(100) Genero "NULL"
        varchar(20) Iswc "UNIQUE partial, NULL"
        varchar(20) Status "CHECK: PENDENTE|LIBERADO|BLOQUEADO|DOMINIO_PUBLICO|DEPURADA"
        varchar(500) BloqueioJustificativa "NULL"
        boolean DominioPublico "DEFAULT FALSE"
        uuid ObraDepuradaParaId FK "NULL, self-ref"
        timestamptz CriadoEm "NOT NULL"
        timestamptz AtualizadoEm "NOT NULL"
    }

    titularidades_autorais {
        uuid Id PK "DEFAULT gen_random_uuid()"
        uuid ObraId FK "NOT NULL"
        uuid TitularId FK "NOT NULL"
        varchar(10) Categoria "CHECK: AUTOR|EDITOR"
        decimal(8_4) Percentual "CHECK: >0 AND <=100"
        timestamptz CriadoEm "DEFAULT NOW()"
    }

    fonogramas {
        uuid Id PK
        varchar(12) Isrc "UNIQUE partial, NOT NULL"
        uuid ObraId FK "NOT NULL"
        varchar(100) PaisOrigem "NOT NULL"
        date DataGravacao "NULL"
        date DataLancamento "NULL"
        varchar(25) Status "CHECK: PENDENTE_VALIDACAO|PENDENTE_DOCUMENTACAO|LIBERADO|BLOQUEADO|DEPURADO"
        varchar(500) UrlAudio "NULL"
        varchar(500) BloqueioJustificativa "NULL"
        uuid FonogramaDepuradoParaId FK "NULL, self-ref"
        boolean PercentuaisDesatualizados "DEFAULT FALSE"
        timestamptz CriadoEm "NOT NULL"
        timestamptz AtualizadoEm "NOT NULL"
    }

    participacoes_conexas {
        uuid Id PK "DEFAULT gen_random_uuid()"
        uuid FonogramaId FK "NOT NULL"
        uuid TitularId FK "NOT NULL"
        varchar(25) Categoria "CHECK: INTERPRETE|PRODUTOR_FONOGRAFICO|MUSICO_EXECUTANTE"
        decimal(8_4) Percentual "NULL (antes do calculo)"
        timestamptz CriadoEm "DEFAULT NOW()"
    }

    historico_bloqueios {
        uuid Id PK
        varchar(15) EntidadeTipo "CHECK: OBRA|FONOGRAMA"
        uuid EntidadeId "NOT NULL"
        varchar(15) Acao "CHECK: BLOQUEIO|DESBLOQUEIO"
        varchar(500) Justificativa "NULL"
        timestamptz DataHora "DEFAULT NOW()"
    }

    outbox_events {
        uuid Id PK
        varchar(100) Type "NOT NULL"
        varchar(100) RoutingKey "NOT NULL"
        varchar(50) Subject "NOT NULL"
        jsonb Payload "NOT NULL"
        timestamptz CreatedAt "NOT NULL"
        timestamptz PublishedAt "NULL"
        integer Attempts "DEFAULT 0"
    }

    associacoes ||--o{ titulares : "1:N (AssociacaoId)"
    titulares ||--o{ titularidades_autorais : "1:N (TitularId)"
    obras_musicais ||--o{ titularidades_autorais : "1:N (ObraId)"
    obras_musicais ||--o{ fonogramas : "1:N (ObraId)"
    obras_musicais ||--o| obras_musicais : "self-ref (ObraDepuradaParaId)"
    fonogramas ||--o{ participacoes_conexas : "1:N (FonogramaId)"
    titulares ||--o{ participacoes_conexas : "1:N (TitularId)"
    fonogramas ||--o| fonogramas : "self-ref (FonogramaDepuradoParaId)"
```

---

## Resumo das Tabelas

| # | Tabela | Registros | Propósito |
|---|--------|-----------|-----------|
| 1 | `associacoes` | 7 (seed fixo) | Associações de gestão coletiva do ECAD |
| 2 | `titulares` | N | Titulares de direitos (PF/PJ) com CPF/CNPJ como Value Objects |
| 3 | `obras_musicais` | N | Obras musicais com ISWC, depuração e domínio público |
| 4 | `titularidades_autorais` | N | Vínculo titular↔obra com categoria (Autor/Editor) e percentual (soma=100%) |
| 5 | `fonogramas` | N | Gravações com ISRC, depuração e participações conexas |
| 6 | `participacoes_conexas` | N | Vínculo titular↔fonograma com cálculo automático (43,7/41,7/14,6) |
| 7 | `historico_bloqueios` | N | Auditoria de bloqueios/desbloqueios (polimórfica) |
| 8 | `outbox_events` | N | Outbox Pattern para publicação de eventos no RabbitMQ |

## Relacionamentos

| Origem | → | Destino | Tipo | FK |
|--------|---|---------|------|-----|
| titulares | → | associacoes | N:1 | AssociacaoId |
| titularidades_autorais | → | obras_musicais | N:1 | ObraId |
| titularidades_autorais | → | titulares | N:1 | TitularId |
| fonogramas | → | obras_musicais | N:1 | ObraId |
| participacoes_conexas | → | fonogramas | N:1 | FonogramaId |
| participacoes_conexas | → | titulares | N:1 | TitularId |
| obras_musicais | → | obras_musicais | self-ref | ObraDepuradaParaId |
| fonogramas | → | fonogramas | self-ref | FonogramaDepuradoParaId |

## Índices

| Tabela | Índice | Tipo | Colunas |
|--------|--------|------|---------|
| titulares | ix_titulares_nome | GIN (trigram) | Nome |
| titulares | ix_titulares_associacao | B-tree | AssociacaoId |
| titulares | ix_titulares_status | B-tree | Status |
| titulares | uq_titulares_cpf | Unique partial | Cpf WHERE IS NOT NULL |
| titulares | uq_titulares_cnpj | Unique partial | Cnpj WHERE IS NOT NULL |
| obras_musicais | ix_obras_titulo | GIN (trigram) | Titulo |
| obras_musicais | ix_obras_tipo | B-tree | Tipo |
| obras_musicais | ix_obras_status | B-tree | Status |
| obras_musicais | uq_obras_iswc | Unique partial | Iswc WHERE IS NOT NULL |
| obras_musicais | ix_obras_depurada_para | B-tree partial | ObraDepuradaParaId WHERE IS NOT NULL |
| titularidades_autorais | ix_titularidades_obra | B-tree | ObraId |
| titularidades_autorais | ix_titularidades_titular | B-tree | TitularId |
| titularidades_autorais | uq_titularidades_obra_titular_categoria | Unique | (ObraId, TitularId, Categoria) |
| fonogramas | ix_fonogramas_obra | B-tree | ObraId |
| fonogramas | ix_fonogramas_status | B-tree | Status |
| fonogramas | uq_fonogramas_isrc | Unique partial | Isrc WHERE IS NOT NULL |
| fonogramas | ix_fonogramas_depurado_para | B-tree partial | FonogramaDepuradoParaId WHERE IS NOT NULL |
| participacoes_conexas | ix_participacoes_fonograma | B-tree | FonogramaId |
| participacoes_conexas | ix_participacoes_titular | B-tree | TitularId |
| participacoes_conexas | uq_participacoes_fono_titular_cat | Unique | (FonogramaId, TitularId, Categoria) |
| historico_bloqueios | ix_historico_entidade | B-tree | (EntidadeTipo, EntidadeId) |
| outbox_events | ix_outbox_pendentes | B-tree partial | (PublishedAt, Attempts) WHERE PublishedAt IS NULL AND Attempts < 10 |

## Padrões de Design

1. **Schema-per-Service** — tudo isolado no schema `cadastro`
2. **Value Objects** — Cpf, Cnpj, Isrc, CaeIpi persistidos via HasConversion (record → string)
3. **Enums como VARCHAR** — Status, Tipo, Categoria com CHECK constraints
4. **Unique parcial** — permite múltiplos NULL (Cpf, Cnpj, Iswc)
5. **Self-referencing FK** — depuração de obras e fonogramas
6. **Percentual nullable** — participações conexas: null = não calculado
7. **GIN trigram** — busca ILIKE performática em Nome e Titulo
8. **Outbox Pattern** — eventos com PublishedAt + Attempts + índice parcial
9. **Polimorfismo** — historico_bloqueios com EntidadeTipo (OBRA/FONOGRAMA)
10. **DELETE RESTRICT** — todas as FKs impedem exclusão em cascata
