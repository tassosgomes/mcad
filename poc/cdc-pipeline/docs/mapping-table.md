# Mapeamento: Schema Legado → mcad

## Estratégia de Chave

O campo `codigo` (INTEGER) do legado é **entidade de negócio** — os setores usam
"Obra 5001", "Titular 1003" no dia a dia. Por isso é preservado no mcad.

```
Legado: CD_TITULAR = 1001 (PK + chave de negócio)
   ↓
Staging: codigo = 1001 (PK)
   ↓
Cadastro: id = gen_random_uuid(), codigo = 1001 (UNIQUE)
```

FKs no legado (INTEGER) são emitidas como `*_codigo` no staging e resolvidas
para UUID pela procedure `sync_to_cadastro()` via JOIN.

## TB_ASSOCIACAO → associacoes

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_ASSOCIACAO | codigo | codigo | Direto (chave de negócio) |
| — | — | id | gen_random_uuid() pelo PG |
| NM_ASSOCIACAO | nome | nome | Direto |
| SG_ASSOCIACAO | sigla | sigla | Direto |
| NR_CNPJ | cnpj | cnpj | Direto |
| IN_ATIVO | — | — | Drop (não existe no mcad) |

## TB_TITULAR → titulares

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_TITULAR | codigo | codigo | Direto (chave de negócio) |
| — | — | id | gen_random_uuid() pelo PG |
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
| DT_CADASTRO | criado_em | criado_em | DATE → TIMESTAMPTZ |
| DT_ALTERACAO | atualizado_em | atualizado_em | DATE → TIMESTAMPTZ |

## TB_OBRA → obras_musicais

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_OBRA | codigo | codigo | Direto (chave de negócio) |
| — | — | id | gen_random_uuid() pelo PG |
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
| DT_CADASTRO | criado_em | criado_em | DATE → TIMESTAMPTZ |
| DT_ALTERACAO | atualizado_em | atualizado_em | DATE → TIMESTAMPTZ |

## TB_TITULARIDADE → titularidades_autorais

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_OBRA | obra_codigo (PK) | obra_id | codigo→UUID via JOIN |
| CD_TITULAR | titular_codigo (PK) | titular_id | codigo→UUID via JOIN |
| NR_CATEGORIA | categoria (PK) | categoria | 1→AUTOR, 2→EDITOR |
| — | — | id | gen_random_uuid() pelo PG |
| VL_PERCENTUAL | percentual | percentual | Direto |
| DT_CADASTRO | criado_em | criado_em | DATE → TIMESTAMPTZ |

## TB_FONOGRAMA → fonogramas

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_FONOGRAMA | codigo | codigo | Direto (chave de negócio) |
| — | — | id | gen_random_uuid() pelo PG |
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
| DT_CADASTRO | criado_em | criado_em | DATE → TIMESTAMPTZ |
| DT_ALTERACAO | atualizado_em | atualizado_em | DATE → TIMESTAMPTZ |

## TB_PARTICIPACAO → participacoes_conexas

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_FONOGRAMA | fonograma_codigo (PK) | fonograma_id | codigo→UUID via JOIN |
| CD_TITULAR | titular_codigo (PK) | titular_id | codigo→UUID via JOIN |
| NR_CATEGORIA | categoria (PK) | categoria | 1→INTERPRETE, 2→PRODUTOR_FONOGRAFICO, 3→MUSICO_EXECUTANTE |
| — | — | id | gen_random_uuid() pelo PG |
| VL_PERCENTUAL | percentual | percentual | Direto |
| DT_CADASTRO | criado_em | criado_em | DATE → TIMESTAMPTZ |

## TB_HISTORICO_BLOQUEIO → historico_bloqueios

| Legado | Staging | Cadastro | Transformação |
|--------|---------|----------|---------------|
| CD_HISTORICO | codigo | — | Chave de staging |
| — | — | id | gen_random_uuid() pelo PG |
| NR_TIPO_ENTIDADE | entidade_tipo | entidade_tipo | 1→OBRA, 2→FONOGRAMA |
| CD_ENTIDADE | entidade_codigo | entidade_id | codigo→UUID via JOIN polimórfico (tipo determina tabela) |
| NR_ACAO | acao | acao | 1→BLOQUEIO, 2→DESBLOQUEIO |
| DS_JUSTIFICATIVA | justificativa | justificativa | Direto |
| DT_OCORRENCIA | data_hora | data_hora | DATE → TIMESTAMPTZ |

## Campos Descartados (por domínio)

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
- `TB_DOMINIO` — lookup genérica, valores mapeados inline
- `TB_BANCO` — pertence a outro domínio
