# Domain Document — Identificação

> **Nível 1 da hierarquia de documentação.** Este documento detalha o bounded context do domínio Identificação. Sempre forneça o `vision.md` junto com este arquivo ao iniciar sessões de PRD ou Tech Spec dentro deste domínio.

**Domínio:** Identificação
**Responsável:** a definir
**Status:** `planned`
**Fase do Roadmap:** Fase 2 — Identificação + Arrecadação
**Última revisão:** 2026-04-01

---

## 1. Propósito do Domínio (Domain Purpose)

### Responsabilidade Principal
Receber execuções musicais de diversas origens, identificar obras e fonogramas via ISRC/ISWC consultando o Cadastro, gerenciar execuções pendentes de identificação e fechar o Rol de Execuções do período, disponibilizando-o para o processo de Distribuição.

### Problema que Resolve
Sem um processo estruturado de captação e identificação, a Distribuição não tem base confiável para calcular créditos — não sabe quais obras foram executadas, quantas vezes, em qual rubrica ou com qual peso de utilização. O domínio de Identificação transforma listas brutas de execuções em um Rol validado e fechado, rastreável por rubrica e período.

### Fora do Escopo deste Domínio (Out of Scope)
- Amostragem estatística de execuções (distribuição indireta) → simplificado para PoC: todas as execuções são identificadas diretamente
- Captação automática via integração com plataformas de streaming ou emissoras → apenas upload CSV e formulário manual
- Gestão de usuários de música (licenciados) → domínio Arrecadação (D03)
- Cálculo de créditos e valores de distribuição → domínio Distribuição (D04)
- Validação de regras cadastrais (percentuais, status de obra) → domínio Cadastro (D01)
- Rol retroativo (execuções de períodos anteriores adicionadas a um Rol já fechado) → fora da PoC

---

## 2. Usuários do Domínio (Domain Users)

| Perfil (Role) | O que faz neste domínio | Frequência de uso |
|---|---|---|
| Analista de Identificação | Cria captações, registra execuções (manual ou upload CSV), identifica execuções pendentes manualmente e fecha o Rol. É o único responsável por uma captação do início ao fim. | Diária |
| Consultor de Identificação | Consulta captações, execuções e status do Rol. Acesso somente leitura. | Eventual |

---

## 3. Entidades Principais (Core Entities)

> Entidades são os objetos de negócio centrais deste domínio. Não é um schema de banco de dados — é o vocabulário do domínio.

| Entidade | Descrição | Atributos Principais | Relacionamentos |
|---|---|---|---|
| Captação | Contêiner que agrupa todas as execuções de uma rubrica em um dia específico. Criada pelo Analista, transita pelos estados Aberta → Fechada ou Cancelada. Representa o Rol de Execuções quando no estado Fechado. | rubrica, período (data diária `YYYY-MM-DD`), usuário de música (texto livre), status (ABERTA / FECHADA / CANCELADA), analista responsável, distribuicaoProcessada (bool — flag de bloqueio de cancelamento), justificativaCancelamento (texto) | possui: Execuções |
| Execução | Registro de uma obra/fonograma executado dentro de uma captação. Acumula contagem de ocorrências. Pode estar Identificada (vinculada a obra/fonograma do Cadastro) ou Pendente de Identificação. | ISRC ou ISWC informado, obra_id (resolvido), fonograma_id (resolvido), tipo de utilização, quantidade de ocorrências, status (IDENTIFICADA / PENDENTE) | pertence a: Captação; referencia: Obra e Fonograma (Cadastro) |
| Tipo de Utilização | Classificação do uso da música com fator de peso. Seed fixo, não editável pelo usuário. | sigla, descrição, peso (fator decimal) | atribuído a: Execução |
| Rubrica | Segmento de utilização musical que contextualiza uma captação. Cada rubrica determina se suas execuções exigem classificação por tipo de utilização. Seed fixo. | sigla, nome, exige classificação (boolean) | usada por: Captação |

### Tipos de Utilização (seed fixo)

| Sigla | Descrição | Peso (Fator) |
|---|---|---|
| TA | Tema de Abertura | 1/1 (100%) |
| TE | Tema de Encerramento | 1/1 (100%) |
| PE | Performance Cênica | 1/1 (100%) |
| BK | Background (Música de Fundo) | 1/12 (≈8,33%) |

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

> **Regra:** A classificação por tipo de utilização (TA, TE, PE, BK) só se aplica a rubricas audiovisuais (TV Aberta, TV Fechada, Cinema, VOD). Demais rubricas registram execuções sem classificação de peso.

---

## 4. Features Previstas (Planned Features)

| # | Feature | Descrição | Prioridade | Status | PRD |
|---|---|---|---|---|---|
| F01 | Gestão de Captações | Criar, listar e acompanhar captações por rubrica + período. Garante unicidade de Rol não-cancelado por rubrica+período. | Must Have | `done` | `tasks/prd-gestao-captacoes/prd.md` |
| F02 | Registro Manual de Execuções | Formulário para inclusão individual de execuções com busca integrada ao Cadastro (ISRC, ISWC, título, titular), campos condicionais por rubrica, criação inline de obra/fonograma pendente. | Must Have | `done` | `tasks/prd-registro-manual-execucoes/prd.md` |
| F03 | Upload de Execuções via CSV | Layout CSV (`;` separador, UTF-8), upload para MinIO, processamento assíncrono com agrupamento de linhas idênticas, identificação automática, relatório de erros por linha/coluna. Até 10.000 linhas. | Must Have | `prd-ready` | `tasks/prd-upload-csv-execucoes/prd.md` |
| F04 | Identificação de Execuções | Tela centralizada de pendentes com indicador de impacto (captações afetadas), resolução manual (vincular a obra/fonograma LIBERADA), resolução em lote, re-verificação automática via background job. | Must Have | `prd-ready` | `tasks/prd-identificacao-execucoes/prd.md` |
| F05 | Fechamento do Rol | Ação explícita e irreversível do Analista. Valida pré-requisitos (zero pendentes, min 1 execução, classificação audiovisual). Publica `identificacao.rol.fechado` via Outbox Pattern. Payload diferenciado: audiovisual (tempo+peso) vs áudio (quantidade). | Must Have | `prd-ready` | `tasks/prd-fechamento-rol/prd.md` |
| F06 | Cancelamento e Recriação | Cancelar Rol fechado com justificativa obrigatória (publica `identificacao.rol.cancelado`). Bloqueado se Distribuição já processou (`distribuicao.rol.processado`). 3 opções de recriação: copiar execuções, recriar vazia ou apenas cancelar. | Must Have | `prd-ready` | `tasks/prd-cancelamento-recriacao/prd.md` |

**Prioridades (MoSCoW):** `Must Have` · `Should Have` · `Could Have` · `Won't Have`
**Status possíveis:** `planned` · `prd-ready` · `in-progress` · `done` · `out-of-scope`

---

## 5. Dependências (Domain Dependencies)

### Depende de (Upstream)

| Domínio | O que consome | Tipo | Criticidade |
|---|---|---|---|
| Cadastro | Resolução de ISRC → fonograma e ISWC → obra. Valida se obra/fonograma existe e está liberado. | Consulta HTTP (ACL — Anti-Corruption Layer) | Alta |

### Fornece para (Downstream)

| Domínio | O que fornece | Tipo | Criticidade |
|---|---|---|---|
| Distribuição | Rol de Execuções fechado (rubrica + período + execuções identificadas com pesos) | Evento assíncrono `identificacao.rol.fechado` | Alta |
| Distribuição | Invalidação de Rol cancelado | Evento assíncrono `identificacao.rol.cancelado` | Alta |
| Analytics | Eventos de mudança de estado das captações | Evento assíncrono (RabbitMQ) | Média |

### Integrações Externas (External Integrations)

| Sistema Externo | Finalidade | Direção | Status |
|---|---|---|---|
| MinIO (S3-compatible) | Armazenamento de arquivos CSV de execuções enviados via upload | Entrada | `planned` |

---

## 6. Regras de Negócio (Business Rules)

| ID | Regra | Origem |
|---|---|---|
| RN-01 | Só pode existir um Rol não-cancelado (ABERTA ou FECHADA) por rubrica + período | Integridade de negócio |
| RN-02 | Execução cujo ISRC/ISWC não tem match no Cadastro fica no estado "Pendente de Identificação" | Simplificação para PoC |
| RN-03 | Execuções acumulam contagem — a mesma obra pode aparecer N vezes na mesma captação com quantidades independentes | Regulamento de Distribuição |
| RN-04 | Após fechamento do Rol, nenhuma execução pode ser adicionada, editada ou removida | Integridade de negócio |
| RN-05 | Para corrigir um Rol fechado é obrigatório cancelá-lo e recriar uma nova captação para o mesmo período (não há reabertura) | Integridade de negócio |
| RN-06 | Pesos por tipo de utilização: TA, TE, PE = fator 1/1 (100%); BK = fator 1/12 (≈8,33%) | Regulamento de Distribuição |
| RN-07 | O período de captação é definido manualmente pelo Analista ao criar a captação | Simplificação para PoC |
| RN-08 | O Analista responsável pela captação é o único que pode registrar execuções e fechar o Rol | Controle de responsabilidade |
| RN-09 | A identificação automática ocorre via ISRC (resolve para fonograma) ou ISWC (resolve para obra) consultando o Cadastro por HTTP | Integração com Cadastro |
| RN-10 | Execuções pendentes podem ser identificadas manualmente pelo Analista vinculando à obra ou fonograma existente no Cadastro | Fluxo de exceção |
| RN-11 | O cancelamento de um Rol (mesmo que refeito depois) deve publicar o evento `identificacao.rol.cancelado` para que a Distribuição invalide qualquer snapshot baseado nesse Rol | Consistência entre domínios |
| RN-12 | A classificação por tipo de utilização (TA, TE, PE, BK) é obrigatória apenas para rubricas audiovisuais (TV Aberta, TV Fechada, Cinema, VOD). Demais rubricas (Rádio, Streaming Áudio, Show) registram execuções sem classificação | Regulamento de Distribuição |

---

## 7. Eventos do Domínio (Domain Events)

### Produz (Publishes)
- `identificacao.rol.fechado` — Rol disponível para distribuição; contém rubrica, período, lista de execuções identificadas com pesos e referências a obra_id/fonograma_id
- `identificacao.rol.cancelado` — Rol invalidado; Distribuição deve desconsiderar qualquer snapshot baseado neste Rol

### Consome (Subscribes)
- `distribuicao.rol.processado` — indica que o Rol foi usado no cálculo de distribuição. Ao receber, marca a captação como processada (`distribuicaoProcessada = true`), bloqueando cancelamento (F06).

---

## 8. Estratégia de Desenvolvimento (Development Strategy)

### Ordem de Implementação Sugerida
1. **F01 — Gestão de Captações** — base do domínio, implementa RN-01 e RN-07
2. **F02 — Registro Manual de Execuções** — entrada mais simples, sem dependência externa
3. **F03 — Upload via CSV + MinIO** — depende de F02 (mesma lógica de inserção)
4. **F04 — Identificação de Execuções** — depende de F02/F03 e da integração HTTP com Cadastro
5. **F05 — Fechamento do Rol** — depende de F04, implementa RN-04 e publica evento
6. **F06 — Cancelamento e Recriação** — depende de F05, implementa RN-05 e RN-11

### Riscos do Domínio

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Layout do CSV mal definido gera retrabalho de parsing | Média | Médio | Especificar layout exato (colunas, tipos, encoding) no PRD de F03 antes de implementar |
| Consulta HTTP ao Cadastro pode falhar durante processamento de CSV volumoso | Média | Alto | Processamento assíncrono com fila interna; registrar como Pendente em caso de timeout |
| Analista fecha Rol com execuções ainda pendentes | Alta | Médio | Definir no PRD de F05 se o fechamento bloqueia quando há pendentes ou apenas alerta (decisão de produto) |
| Distribuição iniciada após cancelamento de Rol (race condition entre eventos) | Baixa | Alto | `identificacao.rol.cancelado` deve ser processado pela Distribuição antes de permitir novo processo de distribuição para o mesmo período |

---

## 9. Questões em Aberto (Open Questions)

- [x] ~~O fechamento do Rol (F05) deve ser bloqueado se existirem pendentes?~~ → Resolvido: **bloqueado**. Zero pendentes é pré-requisito obrigatório.
- [ ] No CSV, uma linha representa uma execução única ou pode conter a quantidade de ocorrências como coluna? (Impacta o layout e a RN-03)
- [ ] A consulta ao Cadastro via HTTP deve validar apenas a existência da obra/fonograma ou também o status LIBERADO? (Execuções de obras BLOQUEADAS devem ficar pendentes ou ser aceitas?)

---

*Domain Doc gerado com a skill `flow-domain-creator`. Para criar PRDs das features deste domínio, use a skill `flow-prd-creator` fornecendo o `vision.md` e este `domain.md` como contexto.*
