# Mapeamento v3: POCGG (Oracle legado) → mcad (Confluent Platform + Flink SQL)

> Atualizado para refletir a **modelagem real** do legado (`modelagem-banco-old.txt`,
> schema `POCGG`). A versão anterior deste documento usava tabelas sintéticas
> (`TB_ASSOCIACAO`, `TB_OBRA`, `NR_CATEGORIA`, etc.) que não existem no banco real.

## 🟡 PoC Mode — simplificações aplicadas

Este documento descreve o **modo PoC** do pipeline: o objetivo é validar
fim-a-fim (XStream → Kafka → Flink → JDBC Sink → Oracle destino), **não**
reproduzir com fidelidade todas as regras do legado. Decisões de simplificação:

| # | Decisão | Impacto |
|---|---------|---------|
| S1 | **Vínculo Titular↔Associação**: filtrar apenas `COD_CATEGORIA = 'AU'` em `TITULARIDADE`. Titulares só-conexos ficam sem associação. | Elimina `ROW_NUMBER` e priorização multi-categoria. |
| S2 | **Lookups de domínio**: hard-coded nos `CASE WHEN` com os códigos assumidos (`DA/DC/AU/ED/IN/PR/MU/LIT/VER/POT`). Seed da PoC usa esses valores. | Sem dependência de `TB_DOMINIO`. |
| S3 | **Status ambíguos**: qualquer `TIP_SITUACAOFONO` fora de `{L,V,I}` vira `PENDENTE_VALIDACAO`; qualquer `TIP_SITUACAOCADASTRAL` fora de `{ID,VA}` vira `PENDENTE`. | Default seguro, sem ambiguidade. |
| S4 | **Dedupe por `COD_LINK` / `COD_FONOGRAMA_TITULAR`**: Flink publica tudo; dedupe via `MERGE` com `MAX(COD_LINK)` na procedure PL/SQL. | Zero `ROW_NUMBER` no Flink. |
| S5 | **Titulares sem vínculo**: `LEFT JOIN` no Flink permite NULL; procedure descarta para `cdc_staging.titulares_rejeitados`. | Sem decisão de negócio na PoC. |
| S6 | **Cortes agressivos**: `IND_CALCAUTOMATICO`, `IND_INTPRINCIPAL`, `IND_BLOQUEIO` (em TITULARIDADE) descartados; `DSC_OBSERVACAO` sempre dropado; `percentuais_desatualizados = FALSE` fixo. | Remove lógica condicional residual. |

Os Flink SQL abaixo já refletem essas decisões. Onde uma simplificação se
aplica, há marcador `— PoC (Sn)`.

## Diferenças em relação ao documento anterior

| Aspecto | Versão anterior (sintética) | Versão atual (POCGG real) |
|---------|------------------------------|---------------------------|
| Prefixo de tabela | `TB_*` | sem prefixo (`FONOGRAMA`, `OBRA_MUSICAL`...) |
| Nomes | plural inglês | singular português, schema `POCGG` |
| Associação | `TB_ASSOCIACAO` | `SOCIEDADE` (escopo: `IND_NACIONALCOL='S'`) |
| Titular | `TB_TITULAR` (11 colunas) | `TITULAR` (~60 colunas, muitas fora de escopo) |
| Obra | `TB_OBRA` (14 colunas) | `OBRA_MUSICAL` (~45 colunas) |
| Fonograma | `TB_FONOGRAMA` (14 colunas) | `FONOGRAMA` (~50 colunas) |
| Titularidade autoral | `TB_TITULARIDADE` | `OBRA_TITULAR` (PK composta com `COD_LINK`) |
| Participação conexa | `TB_PARTICIPACAO` | `FONOGRAMA_TITULAR` (PK composta com `COD_DIREITO/COD_CATEGORIA/COD_SUBCATEGORIA`) |
| Histórico de bloqueio | `TB_HISTORICO_BLOQUEIO` | **Não existe como tabela de negócio**; há `AUDITORIA_OGG_LOG` (audit trail via trigger). |
| Enum de tipo pessoa | `NR_TIPO_PESSOA` (1/2) | `TIP_PESSOA` (`F`/`J`) |
| Status fonograma | `NR_STATUS` (1-5) | `TIP_SITUACAOFONO` (`P`/`I`/`V`/`L`/`D`/`R`) + `IND_BLOQUEADA` |
| Status obra | `NR_STATUS` (1-5) | `TIP_SITUACAOCADASTRAL` (`PI`/`PV`/`ID`/`VA`/`DU`/`EC`) + `IND_BLOQUEADA` + `IND_DOMINIOPUBLICO` + `COD_OBRADEPURADA` |
| Categoria | `NR_CATEGORIA` (enum plano) | triplete `COD_DIREITO`+`COD_CATEGORIA`+`COD_SUBCATEGORIA` (lookup-based) |

## Estratégia de Chave (sem alteração conceitual)

```
POCGG.TITULAR.COD_TITULARECAD = 10001 (PK + chave de negócio no legado)
   ↓
Topics raw: ecad.pocgg.titular (Avro, schema no Registry)
   ↓
Flink SQL: renomeia, converte enums, filtra colunas fora de escopo
   ↓
Topics MCAD: MCAD_TITULARES (Avro, schema evoluído)
   ↓
JDBC Sink: cdc_staging.titulares (codigo = 10001, PK)
   ↓
PL/SQL Procedure: cadastro.titulares (id = UUID, codigo = 10001, UNIQUE)
```

> Observação: no documento anterior o source era um `Oracle XE` sintético. Na v3
> real, o source é o **POCGG** com CDC via Confluent **Oracle XStream CDC Source**
> (Opção E: Confluent Platform self-managed) consumindo `SUPPLEMENTAL LOG`
> já habilitado em todas as tabelas POCGG.

---

## POCGG.SOCIEDADE → associacoes

No domínio mcad, `Associacao` representa **apenas** as sociedades nacionais de
gestão coletiva (as 7 filiadas ao ECAD). A tabela `SOCIEDADE` do legado contém
todas as sociedades (incluindo internacionais e representadas). Portanto o
filtro de escopo é `IND_NACIONALCOL = 'S'` (com possibilidade de refinar por
`TIP_SOCIEDADE`).

| POCGG.SOCIEDADE | Topic raw | Flink SQL | Topic MCAD | Staging | Cadastro |
|-----------------|-----------|-----------|------------|---------|----------|
| COD_SOCIEDADE (NUMBER(7)) | COD_SOCIEDADE | → codigo | codigo (PK) | codigo | codigo |
| — | — | — | — | — | id (UUID) |
| NOM_SOCIEDADE (VARCHAR2(80)) | NOM_SOCIEDADE | → nome | nome | nome | nome |
| SGL_SOCIEDADE (VARCHAR2(22)) | SGL_SOCIEDADE | → sigla | sigla | sigla | sigla |
| COD_CGC (NUMBER(14)) | COD_CGC | LPAD(·,14,'0') AS cnpj | cnpj | cnpj | cnpj |
| IND_NACIONALCOL | — | **filtro** (`= 'S'`) | — | — | — |
| TIP_SOCIEDADE | — | **filtro** (`= 'A'`) | — | — | — |
| IND_CISAC, IND_REPRESENTACAO | — | **DROP** | — | — | — |
| Endereço/telefone/email/obs | — | **DROP** (fora do domínio) | — | — | — |

### Flink SQL

```sql
CREATE TABLE MCAD_ASSOCIACOES
WITH ('kafka.partitions' = '3')
AS SELECT
    CAST(COD_SOCIEDADE AS BIGINT)                      AS codigo,
    NOM_SOCIEDADE                                      AS nome,
    SGL_SOCIEDADE                                      AS sigla,
    LPAD(CAST(COD_CGC AS STRING), 14, '0')             AS cnpj
FROM `ecad.pocgg.sociedade`
WHERE IND_NACIONALCOL = 'S'
  AND TIP_SOCIEDADE   = 'A';   -- 'A' = Associação (hipótese; confirmar no lookup)
```

> **Nota**: `COD_CGC` é `NUMBER(14)`; CNPJs com zero à esquerda perderiam
> dígitos se convertidos direto para string — por isso o `LPAD`.

---

## POCGG.TITULARIDADE — vínculo Titular ↔ Associacao

Tabela de relacionamento temporal e multi-categoria que associa um titular a
uma sociedade. **Não tem equivalente direto no mcad** (que modela o vínculo
como 1 `AssociacaoId` em `Titular`), mas é **indispensável** para derivar esse
campo.

### Estrutura relevante

| Coluna | Tipo | Papel |
|--------|------|-------|
| COD_SOCIEDADE | NUMBER(7) | FK → SOCIEDADE (parte da PK) |
| COD_CATEGORIA | CHAR(2) | Categoria profissional do vínculo (`AU`, `ED`, `IN`, `PR`, `MU`) — parte da PK |
| COD_TITULARECAD | NUMBER(13) | FK → TITULAR (parte da PK) |
| DAT_ADMSOC | DATE | Data de admissão — parte da PK (permite histórico) |
| DAT_RESSOC | DATE | Data de rescisão (quando preenchida, vínculo não é mais vigente) |
| DAT_DESLIGTIT | DATE | Data de desligamento do titular |
| IND_SITUACAO | CHAR(1) | `A` = ativo, `C` = cancelado |
| IND_BLOQUEIO | CHAR(1) | `S`/`N` — vínculo bloqueado |
| DAT_BLOQUEIO, COD_MOTIVO | — | Suporte a auditoria de bloqueio |
| COD_TITULARIDADE | NUMBER | UK gerada (útil como `link_codigo` se precisar) |
| DELTA | DATE | timestamp de CDC |

### Regra de colapso — PoC mode

**Objetivo**: 1 linha por `COD_TITULARECAD`.

1. **PoC (S1)**: filtrar `IND_SITUACAO = 'A' AND TRIM(COD_CATEGORIA) = 'AU'`.
   Só considera vínculo autoral ativo; titulares só-conexos ficam sem
   associação.
2. **PoC (S6)**: `DAT_RESSOC`, `DAT_DESLIGTIT`, `IND_BLOQUEIO`, `DAT_BLOQUEIO`,
   `COD_MOTIVO` **não são verificados** no Flink. Se `IND_SITUACAO='A'`, o
   vínculo conta — assume-se que o legado mantém consistência entre os campos.
3. **PoC (S4)**: se houver duplicatas para o mesmo titular, Flink publica
   todas; dedupe via `MAX(DAT_ADMSOC)` acontece no `MERGE` da procedure
   PL/SQL destino.
4. **PoC (S5)**: titulares sem linha ativa → `associacao_codigo NULL` no
   topic; procedure descarta em `titulares_rejeitados`.

Em produção essas regras devem ser revisitadas (ver "Evolução pós-PoC" no fim
do documento).

### Topic e uso

| Topic raw | Uso |
|-----------|-----|
| `ecad.pocgg.titularidade` | fonte para `MCAD_TITULAR_VINCULO_VIGENTE` (Flink view) |

> **Não há topic MCAD_TITULARIDADES_SOCIEDADE dedicado** na v3 — ele seria
> redundante com `MCAD_TITULARES.associacao_codigo`. Se no futuro o domínio
> mcad precisar modelar histórico/múltiplos vínculos, criar um topic próprio
> com a PK composta completa.

### Campos descartados

`DAT_REGISTROTIT`, `DAT_ATUALIZACAE`, `DAT_BLOQUEIO`, `COD_MOTIVO`, `IND_BLOQUEIO`
não fluem para o mcad — servem apenas ao processamento interno do Flink
(filtros do view `MCAD_TITULAR_VINCULO_VIGENTE`).

---

## POCGG.TITULAR → titulares

Entidade mcad `Titular` (7 campos de negócio + FK para `Associacao`). O legado
`TITULAR` tem ~60 colunas (endereço, filiação, múltiplos documentos, campos
operacionais). A maior parte é descartada na transformação para mcad — os
dados de endereço/contato pertencem a outros bounded contexts (Relacionamento,
Distribuição) e não estão no escopo do Cadastro atual.

> **Vínculo com Sociedade**: `TITULAR` no POCGG **não tem FK direta para SOCIEDADE**.
> O relacionamento canônico vive em **`POCGG.TITULARIDADE`** (PK composta
> `(COD_SOCIEDADE, COD_CATEGORIA, COD_TITULARECAD, DAT_ADMSOC)` — temporal e
> multi-categoria). Um titular pode ter múltiplos vínculos simultâneos (p.ex.
> mesmo titular filiado à ABRAMUS como `AU` e como `ED`), e o legado mantém o
> histórico (`DAT_ADMSOC`, `DAT_RESSOC`, `DAT_DESLIGTIT`).
>
> Como o mcad modela **1 associação por titular**, é necessário **colapsar**
> `TITULARIDADE` para o vínculo vigente canônico — ver seção
> [POCGG.TITULARIDADE](#pocggtitularidade--vínculo-titular--associacao) abaixo.

| POCGG.TITULAR | Topic raw | Flink SQL | Topic MCAD | Staging | Cadastro |
|---------------|-----------|-----------|------------|---------|----------|
| COD_TITULARECAD (NUMBER(13)) | COD_TITULARECAD | → codigo | codigo | codigo | codigo |
| — | — | — | — | — | id (UUID) |
| NOM_TITULAR (VARCHAR2(70)) | NOM_TITULAR | → nome | nome | nome | nome |
| TIP_PESSOA (`F`/`J`) | TIP_PESSOA | CASE F→PF, J→PJ | tipo | tipo | tipo |
| COD_CPF (NUMBER(12)) | COD_CPF | LPAD(·,11,'0') quando PF | cpf | cpf | cpf |
| COD_CGC (NUMBER(14)) | COD_CGC | LPAD(·,14,'0') quando PJ | cnpj | cnpj | cnpj |
| NACIONALIDADE_TITULAR (CHAR(2)) | NACIONALIDADE_TITULAR | → nacionalidade | nacionalidade | nacionalidade | nacionalidade |
| COD_CAE (NUMBER(11)) | COD_CAE | → cae_ipi | cae_ipi | cae_ipi | cae_ipi |
| (via POCGG.TITULARIDADE) † | COD_SOCIEDADE do vínculo vigente | **lookup join** (ver abaixo) | associacao_codigo | associacao_codigo | associacao_id |
| IND_SITCADASTRAL (`F`/`P`) + DAT_FALECIMENTO | | **derivação** | status | status | status |
| DAT_CADASTRO | DAT_CADASTRO | → criado_em | criado_em | criado_em | criado_em |
| DAT_ATUALIZACAO | DAT_ATUALIZACAO | → atualizado_em | atualizado_em | atualizado_em | atualizado_em |
| Endereço (TIP/DSC/NRO_ENDERECO, CEP, UF, SGL_PAIS…) | | **DROP** (outro domínio) | — | — | — |
| Telefones, email, homepage | | **DROP** | — | — | — |
| Filiação (NOM_PAI, NOM_MAE, estado civil, sexo, filhos, cônjuge…) | | **DROP** | — | — | — |
| RG, órgão emissor, UF RG, IFPI, IPN, IPI, OMB, Quality | | **DROP** (doc. auxiliares) | — | — | — |
| PCT_BLOQUEIO, TIP_SITFINANCEIRA | | **DROP** (Distribuição) | — | — | — |

† o vínculo vigente é derivado de `POCGG.TITULARIDADE` (ver seção própria),
colapsando múltiplas linhas por titular.

### Derivação de `status` (StatusTitular)

O enum do mcad tem 3 valores: `Ativo`, `Falecido`, `Transferindo`.
No legado não existe campo único equivalente. Derivação proposta:

| Condição no POCGG | status mcad |
|-------------------|-------------|
| `DAT_FALECIMENTO IS NOT NULL` | `FALECIDO` |
| `IND_SITCADASTRAL = 'P'` (Pendente/em transferência) | `TRANSFERINDO` |
| `IND_SITCADASTRAL = 'F'` ou nulo | `ATIVO` |

### Flink SQL

```sql
-- View com vínculo autoral ativo — PoC (S1): só COD_CATEGORIA = 'AU'.
-- Se houver múltiplas linhas ativas para o mesmo titular, a procedure destino
-- resolve com MAX(DAT_ADMSOC) no MERGE — PoC (S4).
CREATE TABLE MCAD_TITULAR_VINCULO AS
SELECT
    CAST(COD_TITULARECAD AS BIGINT) AS titular_codigo,
    CAST(COD_SOCIEDADE   AS BIGINT) AS associacao_codigo,
    DAT_ADMSOC                      AS admissao
FROM `ecad.pocgg.titularidade`
WHERE IND_SITUACAO = 'A'
  AND TRIM(COD_CATEGORIA) = 'AU';

CREATE TABLE MCAD_TITULARES
WITH ('kafka.partitions' = '6')
AS SELECT
    CAST(t.COD_TITULARECAD AS BIGINT)                       AS codigo,
    t.NOM_TITULAR                                           AS nome,
    CASE t.TIP_PESSOA
        WHEN 'F' THEN 'PF'
        WHEN 'J' THEN 'PJ'
    END                                                     AS tipo,
    CASE WHEN t.TIP_PESSOA = 'F' AND t.COD_CPF IS NOT NULL
         THEN LPAD(CAST(t.COD_CPF AS STRING), 11, '0')
         ELSE NULL END                                      AS cpf,
    CASE WHEN t.TIP_PESSOA = 'J' AND t.COD_CGC IS NOT NULL
         THEN LPAD(CAST(t.COD_CGC AS STRING), 14, '0')
         ELSE NULL END                                      AS cnpj,
    t.NACIONALIDADE_TITULAR                                 AS nacionalidade,
    CAST(t.COD_CAE AS STRING)                               AS cae_ipi,
    v.associacao_codigo                                     AS associacao_codigo,  -- PoC (S5): pode ser NULL
    CASE
        WHEN t.DAT_FALECIMENTO IS NOT NULL THEN 'FALECIDO'
        WHEN t.IND_SITCADASTRAL = 'P'      THEN 'TRANSFERINDO'
        ELSE                                    'ATIVO'
    END                                                     AS status,
    t.DAT_CADASTRO                                          AS criado_em,
    COALESCE(t.DAT_ATUALIZACAO, t.DAT_CADASTRO)             AS atualizado_em
FROM `ecad.pocgg.titular` AS t
LEFT JOIN MCAD_TITULAR_VINCULO AS v
  ON v.titular_codigo = CAST(t.COD_TITULARECAD AS BIGINT);
```

> **PoC (S5)**: `associacao_codigo NULL` é permitido no topic e em
> `cdc_staging.titulares`. A procedure PL/SQL move esses registros para
> `cdc_staging.titulares_rejeitados` com motivo `SEM_VINCULO_AUTORAL` e não os
> propaga para `cadastro.titulares`.

---

## POCGG.OBRA_MUSICAL → obras_musicais

| POCGG.OBRA_MUSICAL | Topic raw | Flink SQL | Topic MCAD |
|--------------------|-----------|-----------|------------|
| COD_OBRAMUSECAD (NUMBER(13)) | COD_OBRAMUSECAD | → codigo | codigo |
| NOM_TITULO (VARCHAR2(95)) | NOM_TITULO | → titulo | titulo |
| — (não há subtítulo no POCGG) | — | `NULL AS subtitulo` | subtitulo |
| COD_TIPOOBRACOMPOSTA (CHAR(3)) + IDC_OBRACOMPOSTA | | **derivação** | tipo |
| COD_GENEROMUSICAL (CHAR(10)) | COD_GENEROMUSICAL | → genero (código, resolver no downstream) | genero |
| COD_ISWC (CHAR(11)) | COD_ISWC | → iswc | iswc |
| TIP_SITUACAOCADASTRAL + IND_BLOQUEADA + IND_DOMINIOPUBLICO + COD_OBRADEPURADA | | **derivação** | status |
| DSC_OBSERVACAO (VARCHAR2(3000)) † | DSC_OBSERVACAO | → bloqueio_justificativa (quando bloqueada) | bloqueio_justificativa |
| IND_DOMINIOPUBLICO (`S`/`N`) | IND_DOMINIOPUBLICO | CASE S→TRUE, N→FALSE | dominio_publico |
| COD_OBRADEPURADA (NUMBER(13)) | COD_OBRADEPURADA | → obra_depurada_codigo | obra_depurada_codigo |
| DAT_CADASTRO | DAT_CADASTRO | → criado_em | criado_em |
| DAT_ATUALIZACAO | DAT_ATUALIZACAO | → atualizado_em | atualizado_em |
| NOM_BUSCA, DSC_CORRESPONDENCIA | | **DROP** (auxiliares de busca) | — |
| IND_INSTRUMENTAL, IND_NACIONAL, IND_REGRAVARSOVIA, IND_HOMONIMA, IND_OBRA_DERIVADA | | **DROP** (atributos fora de escopo do mcad atual) | — |
| COD_SOCIEDADE, SOC_RESP_INFO | | **DROP** (uso interno de responsabilidade) | — |
| TMP_DURACAO, COD_LETRA, COD_POUTDEPURADO, SGL_PAIS, SGL_IDIOMA | | **DROP** (não modelado) | — |
| DAT_REGISTROOBRA, DAT_IDENTIFICACAOOBRA, DAT_EMISSAODOC, DAT_GERACAOISWC, DAT_ATUALIZACAOISWC, DAT_DOCUMENTACAO, DAT_CRIACAO | | **DROP** (histórico específico do legado) | — |
| COD_TIPOBLOQUEIO, COD_MOTIVOPENDENCIA | | **DROP** (lookups legado) | — |
| NOMLOGIN, IND_IAG, IND_DUPLICIDADE, IND_VERIFICADUP | | **DROP** (auditoria interna) | — |

† Hipótese: no legado a justificativa de bloqueio fica em `DSC_OBSERVACAO`
(o modelo não tem coluna dedicada). Se houver uma tabela separada de
motivos/bloqueios, revisar.

### Derivação de `tipo` (TipoObra)

O mcad tem 4 tipos: `Musical`, `Literomusical`, `Versao`, `PotPourri`.
No legado o campo que melhor se aproxima é `COD_TIPOOBRACOMPOSTA` (CHAR(3))
combinado com `IDC_OBRACOMPOSTA` (S/N). Lookup proposto (validar com
`TB_DOMINIO`/`COD_TIPOOBRACOMPOSTA` quando disponível):

| `IDC_OBRACOMPOSTA` | `COD_TIPOOBRACOMPOSTA` | tipo mcad |
|--------------------|------------------------|-----------|
| `N` (default) | — | `MUSICAL` |
| `S` | `LIT` | `LITEROMUSICAL` |
| `S` | `VER` | `VERSAO` |
| `S` | `POT` | `POT_POURRI` |
| outros | — | `MUSICAL` (fallback) |

### Derivação de `status` (StatusObra)

Enum mcad: `Pendente`, `Liberado`, `Bloqueado`, `DominioPublico`, `Depurada`.
Prioridade das regras (primeiro que casa vence):

| Condição no POCGG | status mcad |
|-------------------|-------------|
| `COD_OBRADEPURADA IS NOT NULL` | `DEPURADA` |
| `IND_DOMINIOPUBLICO = 'S'` | `DOMINIO_PUBLICO` |
| `IND_BLOQUEADA = 'S'` | `BLOQUEADO` |
| `TIP_SITUACAOCADASTRAL IN ('ID','VA')` | `LIBERADO` |
| default (`PI`, `PV`, `DU`, `EC`) | `PENDENTE` |

### Flink SQL

```sql
-- PoC (S3): status default PENDENTE para valores não reconhecidos.
-- PoC (S6): bloqueio_justificativa e DSC_OBSERVACAO não propagados.
CREATE TABLE MCAD_OBRAS_MUSICAIS
WITH ('kafka.partitions' = '6')
AS SELECT
    CAST(COD_OBRAMUSECAD AS BIGINT)                  AS codigo,
    NOM_TITULO                                       AS titulo,
    CAST(NULL AS STRING)                             AS subtitulo,
    CASE
        WHEN IDC_OBRACOMPOSTA = 'S' AND COD_TIPOOBRACOMPOSTA = 'LIT' THEN 'LITEROMUSICAL'
        WHEN IDC_OBRACOMPOSTA = 'S' AND COD_TIPOOBRACOMPOSTA = 'VER' THEN 'VERSAO'
        WHEN IDC_OBRACOMPOSTA = 'S' AND COD_TIPOOBRACOMPOSTA = 'POT' THEN 'POT_POURRI'
        ELSE 'MUSICAL'
    END                                              AS tipo,
    COD_GENEROMUSICAL                                AS genero,
    COD_ISWC                                         AS iswc,
    CASE
        WHEN COD_OBRADEPURADA IS NOT NULL         THEN 'DEPURADA'
        WHEN IND_DOMINIOPUBLICO = 'S'             THEN 'DOMINIO_PUBLICO'
        WHEN IND_BLOQUEADA     = 'S'              THEN 'BLOQUEADO'
        WHEN TIP_SITUACAOCADASTRAL IN ('ID','VA') THEN 'LIBERADO'
        ELSE                                           'PENDENTE'
    END                                              AS status,
    CAST(NULL AS STRING)                             AS bloqueio_justificativa, -- PoC (S6)
    CASE WHEN IND_DOMINIOPUBLICO = 'S' THEN TRUE ELSE FALSE END
                                                     AS dominio_publico,
    CAST(COD_OBRADEPURADA AS BIGINT)                 AS obra_depurada_codigo,
    DAT_CADASTRO                                     AS criado_em,
    COALESCE(DAT_ALTERACAO, DAT_ATUALIZACAO, DAT_CADASTRO)
                                                     AS atualizado_em
FROM `ecad.pocgg.obra_musical`;
```

---

## POCGG.OBRA_TITULAR → titularidades_autorais

`OBRA_TITULAR` tem PK composta **(COD_TITULARECAD, COD_OBRAMUSECAD, COD_DIREITO,
COD_CATEGORIA, COD_SUBCATEGORIA, COD_LINK)**. No mcad, `TitularidadeAutoral`
tem apenas (ObraId, TitularId, Categoria ∈ {AUTOR, EDITOR}, Percentual).

Para mapear, filtramos somente os registros cujo triplete
`COD_DIREITO/COD_CATEGORIA/COD_SUBCATEGORIA` corresponde a **direitos autorais**
(DA = AUT) e colapsamos o `COD_LINK` (que no legado representa cessões/pseudos
dentro da mesma titularidade — fora do escopo do cadastro mcad atual).

> **Hipótese sobre códigos** (validar com lookup oficial — `TB_DOMINIO` ou
> documentação ECAD): `COD_DIREITO = 'DA'` (Direito Autoral). `COD_CATEGORIA`
> `'AU'`→Autor, `'ED'`→Editor. Outros triplets (coautoria, versão, etc.)
> podem ter seu próprio mapeamento; por ora tratados como `DROP` (assumidos
> não relevantes para a v3) — **revisar com negócio** antes de produção.

| POCGG.OBRA_TITULAR | Topic raw | Flink SQL | Topic MCAD |
|--------------------|-----------|-----------|------------|
| COD_OBRAMUSECAD | COD_OBRAMUSECAD | → obra_codigo | obra_codigo (parte da PK lógica) |
| COD_TITULARECAD | COD_TITULARECAD | → titular_codigo | titular_codigo (parte da PK lógica) |
| COD_DIREITO (CHAR(6)) | — | **filtro** (`TRIM = 'DA'`) | — |
| COD_CATEGORIA (CHAR(2)) | COD_CATEGORIA | CASE AU→AUTOR, ED→EDITOR | categoria |
| COD_SUBCATEGORIA | COD_SUBCATEGORIA | **DROP** (pós-validação) | — |
| COD_LINK | COD_LINK | **colapsar** (ver nota) | — |
| PCT_PARTICIPACAO (NUMBER(5,2)) | PCT_PARTICIPACAO | → percentual | percentual |
| IND_VALIDACAO (`P`/`V`) | IND_VALIDACAO | **filtro opcional** (`= 'V'`) | — |
| IND_SITUACAO | — | **filtro** (`= 'A'`) se existir | — |
| DAT_INICONTRATO, DAT_TERCONTRATO | | **DROP** (atributo contratual, não modelado) | — |
| COD_PSEUDO, IND_BLOQUEIOPARCIAL | | **DROP** | — |
| DELTA | DELTA | → criado_em (proxy) | criado_em |

> **Nota sobre `COD_LINK`**: no legado múltiplas linhas com mesmo
> `(COD_OBRAMUSECAD, COD_TITULARECAD, COD_DIREITO, COD_CATEGORIA, COD_SUBCATEGORIA)`
> existem para representar cessões/sucessões. O mcad assume 1 titularidade por
> (obra, titular, categoria). Sugestão: pegar a linha com `COD_LINK` mais recente
> (`MAX(COD_LINK)` ou `MAX(DELTA)`). Essa lógica é melhor aplicada na **procedure
> PL/SQL** de `cdc_staging → cadastro` (não no Flink), pois depende de estado
> materializado.

### Flink SQL

```sql
-- PoC (S4): publica tudo que é direito autoral; dedupe por COD_LINK acontece
-- na procedure PL/SQL via MERGE WHERE COD_LINK = (SELECT MAX(COD_LINK) ...).
CREATE TABLE MCAD_TITULARIDADES_AUTORAIS
WITH ('kafka.partitions' = '6')
AS SELECT
    CAST(COD_OBRAMUSECAD  AS BIGINT)       AS obra_codigo,
    CAST(COD_TITULARECAD  AS BIGINT)       AS titular_codigo,
    CAST(COD_LINK         AS BIGINT)       AS link_codigo,
    CASE TRIM(COD_CATEGORIA)
        WHEN 'AU' THEN 'AUTOR'
        WHEN 'ED' THEN 'EDITOR'
    END                                    AS categoria,
    PCT_PARTICIPACAO                       AS percentual,
    DELTA                                  AS criado_em
FROM `ecad.pocgg.obra_titular`
WHERE TRIM(COD_DIREITO)   = 'DA'
  AND TRIM(COD_CATEGORIA) IN ('AU','ED');
```

---

## POCGG.FONOGRAMA → fonogramas

| POCGG.FONOGRAMA | Topic raw | Flink SQL | Topic MCAD |
|-----------------|-----------|-----------|------------|
| COD_FONOGRAMA (NUMBER(9)) | COD_FONOGRAMA | → codigo | codigo |
| COD_ISRC (VARCHAR2(12)) | COD_ISRC | → isrc | isrc |
| COD_OBRAMUSECAD (NUMBER(13)) | COD_OBRAMUSECAD | → obra_codigo | obra_codigo |
| SGL_PAIS (CHAR(2)) | SGL_PAIS | → pais_origem | pais_origem |
| DAT_GRAVORIG | DAT_GRAVORIG | → data_gravacao | data_gravacao |
| DAT_LANCAMENTO | DAT_LANCAMENTO | → data_lancamento | data_lancamento |
| TIP_SITUACAOFONO + IND_BLOQUEADA + COD_FONOGRAMAIDENT | | **derivação** | status |
| — (sem campo no legado) | — | `NULL AS url_audio` | url_audio |
| DSC_OBSERVACAO (quando bloqueada) | DSC_OBSERVACAO | → bloqueio_justificativa | bloqueio_justificativa |
| COD_FONOGRAMAIDENT (NUMBER(9)) | COD_FONOGRAMAIDENT | → fonograma_depurado_codigo | fonograma_depurado_codigo |
| PCT_PARTICIPACAOPF/I/MA | | **derivação** | percentuais_desatualizados |
| DAT_CADASTROFONO | DAT_CADASTROFONO | → criado_em | criado_em |
| DAT_ATUALIZACAO | DAT_ATUALIZACAO | → atualizado_em | atualizado_em |
| IND_NACIONAL, IND_INSTRUMENTAL, IND_DOMINIOPUBLICO, IND_ROTULO, IND_PUBLSIMULT, IND_ROTULOCOMMUSICO, IND_SUBSTITUIDOTAPE, IND_ANALISE, IND_TEMAUDIO, IND_IAG | | **DROP** (fora do domínio atual) | — |
| COD_GRA, COD_CROWLEY, COD_GENEROMUSICAL, COD_TIPOFONOGRAMA, COD_COLETIVO, COD_SELO, COD_POUT_POURRIT, COD_LETRA, COD_TIPOBLOQUEIO, COD_SOCIEDADE, COD_TIPMIDIA, COD_MOTIVOPENDENCIA, COD_ARRANJO, COD_PACOTE, COD_SUPORTE_MIDIA, COD_AGREGADORA | | **DROP** (códigos auxiliares) | — |
| TMP_DURACAO, DAT_EMISSAOGRA, DAT_IDFONOGRAMA, DAT_ANALISE, DAT_DOCUMENTACAO, DAT_AUDIO, SGL_PAISPUBLICACAO | | **DROP** | — |
| DSC_OBSERVACAO, DSC_CORRESPONDENCIA, DSC_COMPLEMENTO_ARRANJO, NOMLOGIN, RESP_FONO_PEND | | **DROP** (exceto uso em bloqueio) | — |
| PCT_PARTICIPACAOPF, PCT_PARTICIPACAOI, PCT_PARTICIPACAOMA | | usar para derivar `percentuais_desatualizados` | — |

### Derivação de `status` (StatusFonograma)

Enum mcad: `PendenteValidacao`, `PendenteDocumentacao`, `Liberado`, `Bloqueado`, `Depurado`.
Campo legado `TIP_SITUACAOFONO CHECK IN ('L','P','V','D','R','I')`:

| Condição no POCGG | status mcad |
|-------------------|-------------|
| `IND_BLOQUEADA = 'S'` | `BLOQUEADO` |
| `TIP_SITUACAOFONO = 'R'` ou `COD_FONOGRAMAIDENT IS NOT NULL` | `DEPURADO` |
| `TIP_SITUACAOFONO IN ('L','V')` | `LIBERADO` |
| `TIP_SITUACAOFONO = 'I'` (em identificação) ou `DAT_IDFONOGRAMA IS NOT NULL` | `PENDENTE_DOCUMENTACAO` |
| default (`P`, `D`) | `PENDENTE_VALIDACAO` |

> `D` é provavelmente "documentação" — código ambíguo. Validar com negócio.

### Derivação de `percentuais_desatualizados`

No mcad é flag booleana. Proxy no legado: qualquer `PCT_PARTICIPACAO*` nulo
quando há `FONOGRAMA_TITULAR` vinculado. Implementação mais simples:
`FALSE` inicial; a flag passa a ser atualizada pela procedure PL/SQL a partir
das mudanças em `FONOGRAMA_TITULAR`.

### Flink SQL

```sql
-- PoC (S3): valores desconhecidos de TIP_SITUACAOFONO caem em PENDENTE_VALIDACAO.
-- PoC (S6): bloqueio_justificativa fixo NULL; percentuais_desatualizados FALSE.
CREATE TABLE MCAD_FONOGRAMAS
WITH ('kafka.partitions' = '6')
AS SELECT
    CAST(COD_FONOGRAMA    AS BIGINT)                 AS codigo,
    COD_ISRC                                         AS isrc,
    CAST(COD_OBRAMUSECAD  AS BIGINT)                 AS obra_codigo,
    SGL_PAIS                                         AS pais_origem,
    DAT_GRAVORIG                                     AS data_gravacao,
    DAT_LANCAMENTO                                   AS data_lancamento,
    CASE
        WHEN IND_BLOQUEADA = 'S'                    THEN 'BLOQUEADO'
        WHEN COD_FONOGRAMAIDENT IS NOT NULL         THEN 'DEPURADO'
        WHEN TIP_SITUACAOFONO IN ('L','V')          THEN 'LIBERADO'
        WHEN TIP_SITUACAOFONO = 'I'                 THEN 'PENDENTE_DOCUMENTACAO'
        ELSE                                             'PENDENTE_VALIDACAO'
    END                                              AS status,
    CAST(NULL AS STRING)                             AS url_audio,
    CAST(NULL AS STRING)                             AS bloqueio_justificativa,   -- PoC (S6)
    CAST(COD_FONOGRAMAIDENT AS BIGINT)               AS fonograma_depurado_codigo,
    FALSE                                            AS percentuais_desatualizados,-- PoC (S6)
    DAT_CADASTROFONO                                 AS criado_em,
    COALESCE(DAT_ATUALIZACAO, DAT_CADASTROFONO)      AS atualizado_em
FROM `ecad.pocgg.fonograma`;
```

---

## POCGG.FONOGRAMA_TITULAR → participacoes_conexas

`FONOGRAMA_TITULAR` tem PK composta **(COD_FONOGRAMA, COD_TITULARECAD,
COD_DIREITO, COD_CATEGORIA, COD_SUBCATEGORIA)** e um `COD_FONOGRAMA_TITULAR`
como UK adicional. No mcad, `ParticipacaoConexa` tem (FonogramaId, TitularId,
Categoria ∈ {INTERPRETE, PRODUTOR_FONOGRAFICO, MUSICO_EXECUTANTE}, Percentual?).

Filtramos para direitos conexos (DC = CON). Lookup proposto (validar!):

| `COD_CATEGORIA` | categoria mcad |
|-----------------|----------------|
| `IN` | `INTERPRETE` |
| `PR` | `PRODUTOR_FONOGRAFICO` |
| `MU` | `MUSICO_EXECUTANTE` |
| outras | DROP (fora de escopo) |

| POCGG.FONOGRAMA_TITULAR | Topic raw | Flink SQL | Topic MCAD |
|--------------------------|-----------|-----------|------------|
| COD_FONOGRAMA | COD_FONOGRAMA | → fonograma_codigo | fonograma_codigo |
| COD_TITULARECAD | COD_TITULARECAD | → titular_codigo | titular_codigo |
| COD_DIREITO (CHAR(6)) | — | **filtro** (`TRIM = 'DC'`) | — |
| COD_CATEGORIA (CHAR(2)) | COD_CATEGORIA | CASE IN→INTERPRETE… | categoria |
| COD_SUBCATEGORIA | COD_SUBCATEGORIA | **DROP** (detalhamento não modelado) | — |
| PCT_PARTICIPACAO (NUMBER(10,8)) | PCT_PARTICIPACAO | → percentual (nulo se `IND_CALCAUTOMATICO='S'` e ainda não calculado) | percentual |
| IND_INTPRINCIPAL | — | **DROP** (pode virar feature futura) | — |
| IND_VALIDACAO (`P`/`V`) | IND_VALIDACAO | **filtro** (`= 'V'`) | — |
| IND_SITTITULAR (`A`/`I`) | IND_SITTITULAR | **filtro** (`= 'A'`) | — |
| IND_CALCAUTOMATICO | — | usado para `percentual` nulo | — |
| COD_FONOGRAMA_TITULAR (UK) | COD_FONOGRAMA_TITULAR | → link_codigo (auxiliar staging) | link_codigo |
| DAT_INICONTRATO, DAT_TERCONTRATO, COD_COLETIVO, COD_PSEUDO | | **DROP** | — |
| DELTA | DELTA | → criado_em (proxy) | criado_em |

### Flink SQL

```sql
-- PoC (S4 + S6): sem filtros por IND_VALIDACAO/IND_SITTITULAR/IND_CALCAUTOMATICO.
-- Publica tudo que é direito conexo; percentual NULL é permitido e chega
-- como tal; dedupe por COD_FONOGRAMA_TITULAR na procedure destino.
CREATE TABLE MCAD_PARTICIPACOES_CONEXAS
WITH ('kafka.partitions' = '6')
AS SELECT
    CAST(COD_FONOGRAMA         AS BIGINT)      AS fonograma_codigo,
    CAST(COD_TITULARECAD       AS BIGINT)      AS titular_codigo,
    CAST(COD_FONOGRAMA_TITULAR AS BIGINT)      AS link_codigo,
    CASE TRIM(COD_CATEGORIA)
        WHEN 'IN' THEN 'INTERPRETE'
        WHEN 'PR' THEN 'PRODUTOR_FONOGRAFICO'
        WHEN 'MU' THEN 'MUSICO_EXECUTANTE'
    END                                        AS categoria,
    PCT_PARTICIPACAO                           AS percentual,
    DELTA                                      AS criado_em
FROM `ecad.pocgg.fonograma_titular`
WHERE TRIM(COD_DIREITO)    = 'DC'
  AND TRIM(COD_CATEGORIA)  IN ('IN','PR','MU');
```

---

## POCGG.AUDITORIA_OGG_LOG — **não mapeado**

A tabela `AUDITORIA_OGG_LOG` é usada pelas triggers `TRG_AUD_*` para manter
histórico de INSERT/UPDATE/DELETE de todas as outras tabelas (formato `DADOS_ANTIGOS`
+ `DADOS_NOVOS` em JSON). É **redundante** com o próprio CDC via XStream:
o Kafka já preserva o stream de mudanças.

**Decisão**: não replicar `AUDITORIA_OGG_LOG`. Qualquer necessidade de auditoria
do lado mcad pode ser atendida por:
1. Retenção estendida dos topics raw (`ecad.pocgg.*`);
2. Tableflow → Iceberg (se adotado); ou
3. Tabela de auditoria própria no schema `cadastro` alimentada pelos eventos Outbox.

> `TB_HISTORICO_BLOQUEIO` da versão sintética **não existe** no POCGG real —
> o histórico de bloqueio está embutido em `AUDITORIA_OGG_LOG`. A entidade
> `HistoricoBloqueio` do mcad é alimentada **pelos eventos de domínio do próprio
> serviço** durante a convivência (Cadastro grava seu histórico local quando
> recebe `Obra.Bloqueada`/`Fonograma.Bloqueado` via Outbox). **Não há mapeamento
> CDC para essa entidade.**

---

## Resumo de Topics e particionamento

| Topic MCAD | Partições | Chave | Origem |
|------------|-----------|-------|--------|
| `MCAD_ASSOCIACOES` | 3 | `codigo` | POCGG.SOCIEDADE filtrada |
| `MCAD_TITULARES` | 6 | `codigo` | POCGG.TITULAR |
| `MCAD_OBRAS_MUSICAIS` | 6 | `codigo` | POCGG.OBRA_MUSICAL |
| `MCAD_TITULARIDADES_AUTORAIS` | 6 | `obra_codigo` | POCGG.OBRA_TITULAR filtrada (`DA`) |
| `MCAD_FONOGRAMAS` | 6 | `codigo` | POCGG.FONOGRAMA |
| `MCAD_PARTICIPACOES_CONEXAS` | 6 | `fonograma_codigo` | POCGG.FONOGRAMA_TITULAR filtrada (`DC`) |

> Co-particionar `MCAD_TITULARIDADES_AUTORAIS` por `obra_codigo` e
> `MCAD_PARTICIPACOES_CONEXAS` por `fonograma_codigo` facilita JOINs downstream
> por localidade e paralelismo equivalente ao dos pais.

---

## Evolução pós-PoC

Esses pontos foram **deliberadamente simplificados** para a PoC. Ao promover
para piloto/produção, revisitar:

| Simplificação PoC | Evolução produção |
|-------------------|-------------------|
| S1: só `COD_CATEGORIA='AU'` no vínculo | Reincluir todas as categorias com regra de priorização definida pelo negócio (provável `AU > ED > IN > PR > MU`, ou por sociedade principal). |
| S2: códigos de domínio hard-coded | Carregar `TB_DOMINIO` como stream-table em Flink; fazer lookup dinâmico. |
| S3: status desconhecido → `PENDENTE_*` | Mapear todos os códigos `TIP_SITUACAOFONO`/`TIP_SITUACAOCADASTRAL` com definição do negócio (ex.: `D`, `R`, `EC`). |
| S4: dedupe na procedure | Avaliar `ROW_NUMBER() OVER` no Flink (menor pressão no Oracle destino). |
| S5: titulares sem vínculo em tabela de rejeitados | Decidir política: bloquear ingestão, atribuir associação default, ou aceitar NULL em `cadastro`. |
| S6: `bloqueio_justificativa` sempre NULL, `percentuais_desatualizados` FALSE | Reintroduzir lógica condicional; ligar `percentuais_desatualizados` a eventos reais de mudança em `FONOGRAMA_TITULAR`. |
| `AUDITORIA_OGG_LOG` não replicado | Decidir se Tableflow/Iceberg supre auditoria ou se é preciso caminho próprio. |
| Schema evolution informal | Políticas BACKWARD no Schema Registry, testes de compat em CI. |
