# Mapeamento v2: Schema Legado → mcad (com GoldenGate)

## Mudanças em relação à v1

A estratégia de chave e o mapeamento de campos **não mudam** — são agnósticos
ao mecanismo de CDC. O que muda é **como** a transformação é expressa:

| Aspecto | v1 (Debezium + ksqlDB) | v2 (GoldenGate) |
|---------|------------------------|------------------|
| Renomeação de colunas | ksqlDB `SELECT AS` | GG `COLMAP` |
| Filtro de colunas | ksqlDB projection | GG `FILTER @EXCLUDE` |
| Mapeamento de enums | ksqlDB `CASE` | GG `@CASE` / `@IF` |
| Conversão S/N → bool | ksqlDB `CASE` | GG `@IF` |
| Drop de tabela | Sem connector | Sem `MAP` statement |

## Estratégia de Chave (sem alteração)

```
Legado: CD_TITULAR = 1001 (PK + chave de negócio)
   ↓
Staging: codigo = 1001 (PK)
   ↓
Cadastro: id = gen_random_uuid(), codigo = 1001 (UNIQUE)
```

FKs no legado (INTEGER) são emitidas como `*_codigo` no staging e resolvidas
para UUID pela procedure `sync_to_cadastro()` via JOIN.

---

## TB_ASSOCIACAO → associacoes

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_ASSOCIACAO | codigo | codigo | Direto (chave de negócio) |
| — | — | id | gen_random_uuid() pelo DB |
| NM_ASSOCIACAO | nome | nome | Direto |
| SG_ASSOCIACAO | sigla | sigla | Direto |
| NR_CNPJ | cnpj | cnpj | Direto |
| IN_ATIVO | — | — | Drop (não existe no mcad) |

### GoldenGate MAP

```sql
MAP ecad_legado.tb_associacao, TARGET cdc_staging.associacoes,
  COLMAP (
    codigo  = CD_ASSOCIACAO,
    nome    = NM_ASSOCIACAO,
    sigla   = SG_ASSOCIACAO,
    cnpj    = NR_CNPJ
  );
-- IN_ATIVO é implicitamente dropado (não listado no COLMAP)
```

---

## TB_TITULAR → titulares

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_TITULAR | codigo | codigo | Direto (chave de negócio) |
| — | — | id | gen_random_uuid() pelo DB |
| NM_TITULAR | nome | nome | Direto |
| NR_TIPO_PESSOA | tipo | tipo | 1→PF, 2→PJ |
| NR_CPF | cpf | cpf | Direto |
| NR_CNPJ | cnpj | cnpj | Direto |
| NM_NACIONALIDADE | nacionalidade | nacionalidade | Direto |
| NR_CAE_IPI | cae_ipi | cae_ipi | Direto |
| CD_ASSOCIACAO | associacao_codigo | associacao_id | codigo→UUID via JOIN |
| **NM_ASSOCIACAO** | — | — | **Drop (desnormalizado)** |
| **SG_ASSOCIACAO** | — | — | **Drop (desnormalizado)** |
| NR_STATUS | status | status | 1→ATIVO, 2→FALECIDO, 3→TRANSFERINDO |
| **NR_CONTA_BANCO** | — | — | **Drop (acoplamento financeiro)** |
| **NR_AGENCIA** | — | — | **Drop (acoplamento financeiro)** |
| **CD_BANCO** | — | — | **Drop (acoplamento financeiro)** |
| DT_CADASTRO | criado_em | criado_em | DATE → TIMESTAMP |
| DT_ALTERACAO | atualizado_em | atualizado_em | DATE → TIMESTAMP |

### GoldenGate MAP

```sql
MAP ecad_legado.tb_titular, TARGET cdc_staging.titulares,
  COLMAP (
    codigo            = CD_TITULAR,
    nome              = NM_TITULAR,
    tipo              = @IF (NR_TIPO_PESSOA = 1, 'PF', 'PJ'),
    cpf               = NR_CPF,
    cnpj              = NR_CNPJ,
    nacionalidade     = NM_NACIONALIDADE,
    cae_ipi           = NR_CAE_IPI,
    associacao_codigo = CD_ASSOCIACAO,
    status            = @CASE (NR_STATUS, 1, 'ATIVO', 2, 'FALECIDO', 3, 'TRANSFERINDO'),
    criado_em         = DT_CADASTRO,
    atualizado_em     = DT_ALTERACAO
  );
-- Colunas dropadas: NM_ASSOCIACAO, SG_ASSOCIACAO, NR_CONTA_BANCO, NR_AGENCIA, CD_BANCO
```

---

## TB_OBRA → obras_musicais

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_OBRA | codigo | codigo | Direto (chave de negócio) |
| — | — | id | gen_random_uuid() pelo DB |
| NM_OBRA | titulo | titulo | Direto |
| NM_SUBTITULO | subtitulo | subtitulo | Direto |
| NR_TIPO_OBRA | tipo | tipo | 1→MUSICAL, 2→LITEROMUSICAL, 3→VERSAO, 4→POT_POURRI |
| NM_GENERO | genero | genero | Direto |
| CD_ISWC | iswc | iswc | Direto |
| NR_STATUS | status | status | 1→PENDENTE, 2→LIBERADO, 3→BLOQUEADO, 4→DOMINIO_PUBLICO, 5→DEPURADA |
| DS_BLOQUEIO | bloqueio_justificativa | bloqueio_justificativa | Direto |
| IN_DOMINIO_PUBLICO | dominio_publico | dominio_publico | S→true, N→false |
| CD_OBRA_DEPURADA | obra_depurada_codigo | obra_depurada_para_id | codigo→UUID via self-JOIN |
| **NR_QTD_FONOGRAMAS** | — | — | **Drop (contador desnormalizado)** |
| **NR_QTD_EXECUCOES** | — | — | **Drop (contador desnormalizado)** |
| DT_CADASTRO | criado_em | criado_em | DATE → TIMESTAMP |
| DT_ALTERACAO | atualizado_em | atualizado_em | DATE → TIMESTAMP |

### GoldenGate MAP

```sql
MAP ecad_legado.tb_obra, TARGET cdc_staging.obras_musicais,
  COLMAP (
    codigo                  = CD_OBRA,
    titulo                  = NM_OBRA,
    subtitulo               = NM_SUBTITULO,
    tipo                    = @CASE (NR_TIPO_OBRA, 1, 'MUSICAL', 2, 'LITEROMUSICAL',
                                     3, 'VERSAO', 4, 'POT_POURRI'),
    genero                  = NM_GENERO,
    iswc                    = CD_ISWC,
    status                  = @CASE (NR_STATUS, 1, 'PENDENTE', 2, 'LIBERADO',
                                     3, 'BLOQUEADO', 4, 'DOMINIO_PUBLICO', 5, 'DEPURADA'),
    bloqueio_justificativa  = DS_BLOQUEIO,
    dominio_publico         = @IF (IN_DOMINIO_PUBLICO = 'S', 1, 0),
    obra_depurada_codigo    = CD_OBRA_DEPURADA,
    criado_em               = DT_CADASTRO,
    atualizado_em           = DT_ALTERACAO
  );
-- Colunas dropadas: NR_QTD_FONOGRAMAS, NR_QTD_EXECUCOES
```

> **Nota sobre booleanos**: Oracle não tem tipo BOOLEAN nativo (até 23c).
> Em Oracle XE 21c, `dominio_publico` é mapeado para NUMBER(1) — 1=true, 0=false.
> A procedure `sync_to_cadastro()` converte para BOOLEAN se o target suportar.

---

## TB_TITULARIDADE → titularidades_autorais

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_OBRA | obra_codigo (PK) | obra_id | codigo→UUID via JOIN |
| CD_TITULAR | titular_codigo (PK) | titular_id | codigo→UUID via JOIN |
| NR_CATEGORIA | categoria (PK) | categoria | 1→AUTOR, 2→EDITOR |
| — | — | id | gen_random_uuid() pelo DB |
| VL_PERCENTUAL | percentual | percentual | Direto |
| DT_CADASTRO | criado_em | criado_em | DATE → TIMESTAMP |

### GoldenGate MAP

```sql
MAP ecad_legado.tb_titularidade, TARGET cdc_staging.titularidades_autorais,
  COLMAP (
    obra_codigo    = CD_OBRA,
    titular_codigo = CD_TITULAR,
    categoria      = @CASE (NR_CATEGORIA, 1, 'AUTOR', 2, 'EDITOR'),
    percentual     = VL_PERCENTUAL,
    criado_em      = DT_CADASTRO
  ),
  KEYCOLS (obra_codigo, titular_codigo, categoria);
```

> **KEYCOLS**: Necessário para tabelas junction sem PK surrogate no staging.
> GoldenGate usa essas colunas para identificar registros em UPDATE/DELETE.

---

## TB_FONOGRAMA → fonogramas

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_FONOGRAMA | codigo | codigo | Direto (chave de negócio) |
| — | — | id | gen_random_uuid() pelo DB |
| CD_ISRC | isrc | isrc | Direto |
| CD_OBRA | obra_codigo | obra_id | codigo→UUID via JOIN |
| NM_PAIS_ORIGEM | pais_origem | pais_origem | Direto |
| DT_GRAVACAO | data_gravacao | data_gravacao | Direto (DATE) |
| DT_LANCAMENTO | data_lancamento | data_lancamento | Direto (DATE) |
| NR_STATUS | status | status | 1→PENDENTE_VALIDACAO, 2→PENDENTE_DOCUMENTACAO, 3→LIBERADO, 4→BLOQUEADO, 5→DEPURADO |
| DS_URL_AUDIO | url_audio | url_audio | Direto |
| DS_BLOQUEIO | bloqueio_justificativa | bloqueio_justificativa | Direto |
| CD_FONOGRAMA_DEPURADO | fonograma_depurado_codigo | fonograma_depurado_para_id | codigo→UUID via self-JOIN |
| IN_PERC_DESATUALIZADO | percentuais_desatualizados | percentuais_desatualizados | S→true, N→false |
| **NM_OBRA** | — | — | **Drop (desnormalizado)** |
| DT_CADASTRO | criado_em | criado_em | DATE → TIMESTAMP |
| DT_ALTERACAO | atualizado_em | atualizado_em | DATE → TIMESTAMP |

### GoldenGate MAP

```sql
MAP ecad_legado.tb_fonograma, TARGET cdc_staging.fonogramas,
  COLMAP (
    codigo                    = CD_FONOGRAMA,
    isrc                      = CD_ISRC,
    obra_codigo               = CD_OBRA,
    pais_origem               = NM_PAIS_ORIGEM,
    data_gravacao             = DT_GRAVACAO,
    data_lancamento           = DT_LANCAMENTO,
    status                    = @CASE (NR_STATUS,
                                  1, 'PENDENTE_VALIDACAO',
                                  2, 'PENDENTE_DOCUMENTACAO',
                                  3, 'LIBERADO',
                                  4, 'BLOQUEADO',
                                  5, 'DEPURADO'),
    url_audio                 = DS_URL_AUDIO,
    bloqueio_justificativa    = DS_BLOQUEIO,
    fonograma_depurado_codigo = CD_FONOGRAMA_DEPURADO,
    percentuais_desatualizados = @IF (IN_PERC_DESATUALIZADO = 'S', 1, 0),
    criado_em                 = DT_CADASTRO,
    atualizado_em             = DT_ALTERACAO
  );
-- Coluna dropada: NM_OBRA
```

---

## TB_PARTICIPACAO → participacoes_conexas

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_FONOGRAMA | fonograma_codigo (PK) | fonograma_id | codigo→UUID via JOIN |
| CD_TITULAR | titular_codigo (PK) | titular_id | codigo→UUID via JOIN |
| NR_CATEGORIA | categoria (PK) | categoria | 1→INTERPRETE, 2→PRODUTOR_FONOGRAFICO, 3→MUSICO_EXECUTANTE |
| — | — | id | gen_random_uuid() pelo DB |
| VL_PERCENTUAL | percentual | percentual | Direto |
| DT_CADASTRO | criado_em | criado_em | DATE → TIMESTAMP |

### GoldenGate MAP

```sql
MAP ecad_legado.tb_participacao, TARGET cdc_staging.participacoes_conexas,
  COLMAP (
    fonograma_codigo = CD_FONOGRAMA,
    titular_codigo   = CD_TITULAR,
    categoria        = @CASE (NR_CATEGORIA,
                          1, 'INTERPRETE',
                          2, 'PRODUTOR_FONOGRAFICO',
                          3, 'MUSICO_EXECUTANTE'),
    percentual       = VL_PERCENTUAL,
    criado_em        = DT_CADASTRO
  ),
  KEYCOLS (fonograma_codigo, titular_codigo, categoria);
```

---

## TB_HISTORICO_BLOQUEIO → historico_bloqueios

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_HISTORICO | codigo | — | Chave de staging |
| — | — | id | gen_random_uuid() pelo DB |
| NR_TIPO_ENTIDADE | entidade_tipo | entidade_tipo | 1→OBRA, 2→FONOGRAMA |
| CD_ENTIDADE | entidade_codigo | entidade_id | codigo→UUID via JOIN polimórfico |
| NR_ACAO | acao | acao | 1→BLOQUEIO, 2→DESBLOQUEIO |
| DS_JUSTIFICATIVA | justificativa | justificativa | Direto |
| DT_OCORRENCIA | data_hora | data_hora | DATE → TIMESTAMP |

### GoldenGate MAP

```sql
MAP ecad_legado.tb_historico_bloqueio, TARGET cdc_staging.historico_bloqueios,
  COLMAP (
    codigo          = CD_HISTORICO,
    entidade_tipo   = @CASE (NR_TIPO_ENTIDADE, 1, 'OBRA', 2, 'FONOGRAMA'),
    entidade_codigo = CD_ENTIDADE,
    acao            = @CASE (NR_ACAO, 1, 'BLOQUEIO', 2, 'DESBLOQUEIO'),
    justificativa   = DS_JUSTIFICATIVA,
    data_hora       = DT_OCORRENCIA
  );
```

---

## Campos Descartados (sem alteração)

### Desnormalização (dados duplicados)
- `TB_TITULAR.NM_ASSOCIACAO` — já existe via FK para associacoes
- `TB_TITULAR.SG_ASSOCIACAO` — idem
- `TB_FONOGRAMA.NM_OBRA` — já existe via FK para obras_musicais

### Acoplamento com outros domínios
- `TB_TITULAR.NR_CONTA_BANCO` — pertence ao domínio Distribuição
- `TB_TITULAR.NR_AGENCIA` — idem
- `TB_TITULAR.CD_BANCO` — idem

### Contadores calculados
- `TB_OBRA.NR_QTD_FONOGRAMAS` — calculável via COUNT
- `TB_OBRA.NR_QTD_EXECUCOES` — pertence ao domínio Identificação

### Tabelas não migradas
- `TB_DOMINIO` — lookup genérica, valores mapeados inline via `@CASE`
- `TB_BANCO` — pertence a outro domínio

---

## Resumo de Transformações GoldenGate

| Função GG | Uso no mapeamento | Exemplo |
|-----------|------------------|---------|
| `COLMAP` | Renomear colunas | `codigo = CD_TITULAR` |
| `@IF` | Mapeamento binário | `tipo = @IF(NR_TIPO_PESSOA = 1, 'PF', 'PJ')` |
| `@CASE` | Mapeamento enum multi-valor | `status = @CASE(NR_STATUS, 1, 'ATIVO', ...)` |
| Omissão no COLMAP | Drop de colunas | NM_ASSOCIACAO não listada = dropada |
| `KEYCOLS` | PK composta em junctions | `KEYCOLS (obra_codigo, titular_codigo, categoria)` |

> **Limitação**: GoldenGate COLMAP não faz JOINs cross-table. A resolução
> de FK `codigo→UUID` continua sendo feita pela procedure `sync_to_cadastro()`
> no banco destino — exatamente como na v1.
