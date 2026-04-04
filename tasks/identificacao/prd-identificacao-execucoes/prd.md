# PRD — F04: Identificação de Execuções

> **Domínio:** Identificação (D02)
> **Feature:** F04 — Identificação de Execuções
> **Prioridade:** Must Have
> **Status:** `planned`
> **Última revisão:** 2026-04-04

---

## 1. Visão Geral

Execuções registradas via formulário manual (F02) ou upload CSV (F03) podem ficar com status PENDENTE quando o ISRC/ISWC informado não é encontrado no Cadastro ou quando a obra/fonograma referenciada tem status PENDENTE/BLOQUEADO. Essas pendências impedem o fechamento do Rol (F05) e precisam ser resolvidas.

Esta feature cria uma tela centralizada de gestão de execuções pendentes que agrega dados de todas as captações, mostra o impacto de cada pendência (quantas captações afetadas), permite resolução manual (vincular a obra/fonograma LIBERADA) e resolução em lote (mesmo ISRC/ISWC em múltiplas execuções). Além disso, um background job re-verifica automaticamente o status de obras/fonogramas no Cadastro, resolvendo pendências sem intervenção quando o Cadastro é atualizado.

---

## 2. Objetivos

| Objetivo | Métrica de Sucesso |
|---|---|
| Visibilidade centralizada de pendentes | Analista localiza todas as pendências do sistema em uma única tela com filtros |
| Resolução eficiente | Pendentes com mesmo ISRC/ISWC em N captações resolvidos em uma única ação (com confirmação) |
| Resolução automática | Pendentes cuja obra/fonograma foi liberada no Cadastro são resolvidos automaticamente pelo background job |
| Impacto visível | Analista vê quantas captações são afetadas por cada pendência antes de priorizar |

---

## 3. Usuários e Papéis

| Perfil | Permissões nesta feature |
|---|---|
| Analista de Identificação | Visualizar pendentes, resolver manualmente (vincular a obra/fonograma LIBERADA), confirmar resolução em lote |
| Consultor de Identificação | Visualizar pendentes. Sem permissão de resolução |

---

## 4. Requisitos Funcionais

### RF-01 — Tela de execuções pendentes

**Descrição:** Tela dedicada (rota própria, não seção de detalhe) que lista todas as execuções com status PENDENTE do sistema, com filtros e indicadores de impacto.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Existem execuções PENDENTES em várias captações | Analista acessa a tela | Lista paginada de execuções pendentes com colunas: título/ISRC/ISWC, captação (rubrica + período), analista responsável, data de criação |
| 2 | Analista aplica filtro por captação | Seleciona uma captação | Lista exibe apenas pendentes daquela captação |
| 3 | Analista aplica filtro por rubrica | Seleciona uma rubrica | Lista exibe pendentes de captações daquela rubrica |
| 4 | Analista aplica filtro por período | Seleciona intervalo de datas | Lista filtra por período das captações |
| 5 | Analista busca por ISRC/ISWC | Digita um código | Lista filtra execuções com aquele ISRC/ISWC |
| 6 | Nenhuma execução pendente | Acessa tela | Empty state: "Nenhuma execução pendente de identificação" |

**Prioridade:** Must Have

---

### RF-02 — Indicador de impacto

**Descrição:** Para cada execução pendente (ou grupo de execuções com mesmo ISRC/ISWC), exibir quantas captações são afetadas.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | ISRC `BRUM99999999` aparece em 15 execuções de 3 captações | Analista vê na lista | Exibe badge/indicador: "3 captações" ao lado do ISRC |
| 2 | ISRC aparece em apenas 1 captação | Analista vê na lista | Exibe "1 captação" |

**Prioridade:** Must Have

---

### RF-03 — Resolução manual

**Descrição:** O Analista seleciona uma execução PENDENTE e busca no Cadastro (mesma busca unificada da F02) para vinculá-la a uma obra/fonograma com status LIBERADO. Ao confirmar, o status da execução muda de PENDENTE → IDENTIFICADA.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Execução PENDENTE selecionada | Analista busca no Cadastro e seleciona obra/fonograma LIBERADA | Execução atualizada: novo obraId/fonogramaId, título e intérpretes preenchidos, status → IDENTIFICADA |
| 2 | Analista seleciona obra/fonograma com status PENDENTE ou BLOQUEADO | Tenta confirmar | Sistema alerta: "Obra/fonograma selecionada não está liberada. A execução continuará pendente" |
| 3 | Captação da execução está FECHADA | Analista tenta resolver | Ação não disponível (RN-04) |

**Regras aplicáveis:** RN-10

**Prioridade:** Must Have

---

### RF-04 — Resolução em lote

**Descrição:** Quando o mesmo ISRC/ISWC não identificado aparece em múltiplas execuções (possivelmente em captações diferentes), o Analista pode resolver todas de uma vez vinculando a uma obra/fonograma LIBERADA. A resolução requer confirmação manual para cada execução afetada.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | ISRC `BRUM99999999` em 15 execuções de 3 captações | Analista clica "Resolver todas" e seleciona obra/fonograma LIBERADA | Sistema exibe lista das 15 execuções com checkbox para confirmar cada uma |
| 2 | Analista confirma 12 de 15 | Confirma | 12 execuções → IDENTIFICADA, 3 permanecem PENDENTE |
| 3 | Algumas execuções estão em captações FECHADAS | Resolução em lote | Execuções de captações FECHADAS são excluídas da resolução (não aparecem na lista de confirmação) |

**Prioridade:** Must Have

---

### RF-05 — Re-verificação automática

**Descrição:** Um background job consulta periodicamente o Cadastro para verificar se obras/fonogramas referenciadas por execuções PENDENTES mudaram de status. Quando uma obra/fonograma passa de PENDENTE/BLOQUEADO para LIBERADO no Cadastro, as execuções que a referenciam são automaticamente atualizadas para IDENTIFICADA.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Execução PENDENTE referencia obra com obraId `X` que estava PENDENTE no Cadastro | Obra `X` é liberada no Cadastro (F07 do Cadastro) | Background job detecta mudança na próxima verificação, execução → IDENTIFICADA |
| 2 | Background job executa | Obra referenciada ainda está PENDENTE | Nenhuma alteração — execução permanece PENDENTE |
| 3 | Execução PENDENTE sem obraId (ISRC não encontrado) | Background job executa | Não há o que re-verificar — execução permanece PENDENTE (requer resolução manual RF-03) |

**Prioridade:** Must Have

---

## 5. Não-Objetivos (Fora de Escopo)

- **Resolução de pendências cadastrais** (completar dados de obra/fonograma) → módulo Cadastro
- **Fechamento automático da captação** quando todos os pendentes são resolvidos → F05 (ação explícita do analista)
- **Regra de 4 olhos** → não se aplica; o mesmo analista pode resolver pendentes da própria captação
- **Criação de obra/fonograma pendente** → já coberto em F02
- **Busca fuzzy/fonética** → PoC usa ILike (já implementado no endpoint de busca)
- **Notificações** (email, push) quando pendentes são resolvidos automaticamente → fora da PoC
- **Resolução automática de execuções sem obraId** (ISRC desconhecido) → requer resolução manual

---

## 6. Restrições Técnicas de Alto Nível

- **Integração Cadastro:** reutiliza CadastroHttpClient (F02) — GET por ID para re-verificação, busca unificada para resolução manual
- **Background job:** similar ao CsvProcessorWorker (F03) — poll periódico de execuções PENDENTES com obraId/fonogramaId, consulta status no Cadastro
- **Auth:** mesmas roles — `analista-identificacao` (resolve), `consultor-identificacao` (visualiza)
- **Tela dedicada:** nova rota `/identificacao/pendentes` (não seção da CaptacaoDetailPage)

---

## 7. Riscos e Premissas

### Premissas
- O CadastroHttpClient (F02) já está implementado e funcional
- O endpoint de busca unificada no Cadastro (F02) já existe
- O background job de re-verificação roda no mesmo serviço de Identificação (não é um serviço separado)
- Execuções de captações FECHADAS não podem ser resolvidas (RN-04 impede qualquer alteração)

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Background job de re-verificação gera muitas consultas ao Cadastro | Média | Médio | Limitar frequência (ex: a cada 5 min) e batch de IDs únicos (não repetir consulta para mesma obra) |
| Volume de pendentes pode ser alto (10.000+ execuções) | Média | Médio | Paginação na tela + índice no banco (status + obraId) |
| Race condition: analista resolve manualmente enquanto job re-verifica | Baixa | Baixo | Idempotente — se já está IDENTIFICADA, não altera novamente |

---

## 8. Rastreabilidade

### Vision Doc
- **Fase:** 2 — Identificação + Arrecadação
- **Domínio:** D02 — Identificação
- **Dependência upstream:** Cadastro (consulta HTTP)

### Domain Doc (`domains/identificacao/domain.md`)
- **Feature:** F04 — Identificação de Execuções
- **Regras de negócio:** RN-02, RN-04, RN-09, RN-10
- **Entidades:** Execução (status PENDENTE → IDENTIFICADA)

---

## 9. Questões em Aberto

Todas as questões foram resolvidas durante o discovery. PRD pronto para API Contract e TechSpec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar o API Contract, use a skill `flow-contract-creator`. Para gerar a Especificação Técnica, use a skill `flow-techspec-creator`.*
