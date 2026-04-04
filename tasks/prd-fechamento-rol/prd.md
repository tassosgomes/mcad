# PRD — F05: Fechamento do Rol

> **Domínio:** Identificação (D02)
> **Feature:** F05 — Fechamento do Rol
> **Prioridade:** Must Have
> **Status:** `planned`
> **Última revisão:** 2026-04-04

---

## 1. Visão Geral

O Rol de Execuções é o produto final do domínio de Identificação — a lista validada e fechada de execuções de uma rubrica/período, pronta para alimentar o processo de Distribuição. O fechamento é uma ação explícita e irreversível do Analista responsável que, ao ser confirmada, transiciona a captação para o estado FECHADA e publica o evento `identificacao.rol.fechado` via Outbox Pattern.

O fechamento só é permitido quando todos os pré-requisitos são atendidos: ao menos uma execução, zero pendentes, e para rubricas audiovisuais, classificação de peso e horários obrigatórios em cada execução.

---

## 2. Objetivos

| Objetivo | Métrica de Sucesso |
|---|---|
| Fechamento seguro — sem dados incompletos | 100% dos Rols fechados atendem todos os pré-requisitos (zero pendentes, dados obrigatórios completos) |
| Evento publicado para Distribuição | 100% dos fechamentos geram evento `identificacao.rol.fechado` com payload completo |
| Irreversibilidade garantida | 0% de edições em captações FECHADAS (sem bypass) |
| Feedback claro ao analista | Pré-requisitos não atendidos listados com checklist visual antes do fechamento |

---

## 3. Usuários e Papéis

| Perfil | Permissões nesta feature |
|---|---|
| Analista de Identificação | Fechar o Rol de captações ABERTAS que são suas (RN-08) |
| Consultor de Identificação | Visualizar status. Sem permissão de fechamento |

---

## 4. Requisitos Funcionais

### RF-01 — Validar pré-requisitos de fechamento

**Descrição:** Antes de permitir o fechamento, o sistema valida todos os pré-requisitos e exibe o resultado como checklist para o Analista.

**Pré-requisitos:**

| # | Pré-requisito | Aplicável a |
|---|---|---|
| 1 | Captação possui ao menos 1 execução | Todas as rubricas |
| 2 | Nenhuma execução com status PENDENTE | Todas as rubricas |
| 3 | Todas as execuções referenciam obra/fonograma com status LIBERADO no Cadastro | Todas as rubricas |
| 4 | Todas as execuções possuem tipo de utilização (TA/TE/PE/BK) | Rubricas audiovisuais (TV Aberta, TV Fechada, Cinema, VOD) |
| 5 | Todas as execuções possuem início e fim preenchidos | Rubricas audiovisuais |

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação ABERTA com 50 execuções, todas IDENTIFICADAS, obras LIBERADAS | Analista clica "Fechar Rol" | Modal de confirmação exibe checklist com todos os itens ✅, botão "Confirmar Fechamento" habilitado |
| 2 | Captação sem execuções | Analista clica "Fechar Rol" | Checklist exibe ❌ "Ao menos 1 execução necessária". Botão desabilitado |
| 3 | 3 execuções PENDENTES | Analista clica "Fechar Rol" | Checklist exibe ❌ "3 execuções pendentes de identificação". Botão desabilitado |
| 4 | Rubrica TV Aberta, 2 execuções sem tipo de utilização | Analista clica "Fechar Rol" | Checklist exibe ❌ "2 execuções sem tipo de utilização". Botão desabilitado |
| 5 | Rubrica TV Aberta, 1 execução sem horário início/fim | Analista clica "Fechar Rol" | Checklist exibe ❌ "1 execução sem horário de início/fim". Botão desabilitado |
| 6 | Execução referencia obra com status PENDENTE no Cadastro | Analista clica "Fechar Rol" | Checklist exibe ❌ "1 execução referencia obra/fonograma não liberada". Botão desabilitado |
| 7 | Rubrica Rádio AM/FM, execuções sem tipo de utilização | Analista clica "Fechar Rol" | Pré-requisitos 4 e 5 não se aplicam → checklist não exibe esses itens |

**Regras aplicáveis:** RN-04, RN-12

**Prioridade:** Must Have

---

### RF-02 — Fechar o Rol

**Descrição:** Ação explícita e irreversível. Ao confirmar, a captação transiciona para FECHADA.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Todos os pré-requisitos atendidos | Analista confirma fechamento | Status da captação → FECHADA. Data de fechamento registrada |
| 2 | Captação FECHADA | Qualquer tentativa de adicionar/editar/excluir execução | Bloqueado (RN-04) |
| 3 | Analista NÃO é dono | Tenta fechar | Ação não disponível (RN-08) |
| 4 | Captação já FECHADA ou CANCELADA | Tenta fechar | Ação não disponível |

**Regras aplicáveis:** RN-04, RN-08

**Prioridade:** Must Have

---

### RF-03 — Publicar evento `identificacao.rol.fechado`

**Descrição:** Ao fechar o Rol, o sistema publica um evento CloudEvents via Outbox Pattern (at-least-once) no RabbitMQ. O payload contém os dados da Identificação — a Distribuição é responsável por buscar dados de titularidade no Cadastro.

**Payload do evento:**

| Campo | Tipo | Descrição | Rubricas |
|---|---|---|---|
| `captacaoId` | UUID | ID da captação fechada | Todas |
| `rubrica` | string | Sigla da rubrica (ex: `TV_ABERTA`) | Todas |
| `periodo` | date | Data da captação (`YYYY-MM-DD`) | Todas |
| `fechadoEm` | datetime | Momento do fechamento (UTC) | Todas |
| `analistaId` | UUID | Analista que fechou | Todas |
| `execucoes` | array | Lista de execuções do Rol | Todas |
| `execucoes[].obraId` | UUID | ID da obra no Cadastro | Todas |
| `execucoes[].fonogramaId` | UUID? | ID do fonograma (se disponível) | Todas |
| `execucoes[].quantidade` | int | Quantidade de ocorrências | Todas |
| `execucoes[].tipoUtilizacao` | string? | Sigla (TA/TE/PE/BK) | Audiovisual |
| `execucoes[].peso` | decimal? | Fator do tipo de utilização | Audiovisual |
| `execucoes[].inicio` | string? | `HH:mm:ss` | Audiovisual |
| `execucoes[].fim` | string? | `HH:mm:ss` | Audiovisual |
| `execucoes[].duracaoSegundos` | int? | Duração calculada | Audiovisual |

> **Nota sobre rubricas:**
> - **Audiovisual** (TV Aberta, TV Fechada, Cinema, VOD): leva tempo (início/fim/duração) + classificação (tipo/peso)
> - **Áudio** (Rádio, Streaming Áudio, Show): leva somente quantidade (sem tempo, sem classificação)

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação fechada com sucesso | Sistema processa | Evento `identificacao.rol.fechado` salvo na tabela outbox com payload completo |
| 2 | Outbox Worker processa | Evento pendente na tabela | Evento publicado no RabbitMQ com routing key `identificacao.rol.fechado` |
| 3 | Publicação falha | RabbitMQ indisponível | Outbox Worker retry (até 10 tentativas, mesmo padrão do Cadastro) |
| 4 | Captação de rubrica audiovisual | Evento publicado | Payload inclui tipo_utilizacao, peso, inicio, fim, duracaoSegundos por execução |
| 5 | Captação de rubrica não-audiovisual | Evento publicado | Payload inclui apenas quantidade por execução (campos audiovisuais null) |

**Prioridade:** Must Have

---

### RF-04 — Feedback visual no frontend

**Descrição:** Botão "Fechar Rol" na CaptacaoDetailPage com modal de confirmação mostrando checklist de pré-requisitos e resumo.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação ABERTA, analista é dono | Acessa detalhe | Botão "Fechar Rol" visível |
| 2 | Analista clica "Fechar Rol" | Modal abre | Exibe checklist de pré-requisitos + resumo: total de execuções, todas identificadas, rubrica |
| 3 | Todos pré-requisitos ✅ | Modal aberto | Botão "Confirmar Fechamento" habilitado |
| 4 | Algum pré-requisito ❌ | Modal aberto | Botão desabilitado, itens faltantes destacados em vermelho |
| 5 | Fechamento confirmado com sucesso | Analista confirma | Toast: "Rol fechado com sucesso". Status da captação atualiza para FECHADA. Botões de edição/exclusão desaparecem |
| 6 | Consultor acessa | Tela de detalhe | Botão "Fechar Rol" não visível |

**Prioridade:** Must Have

---

## 5. Não-Objetivos (Fora de Escopo)

- **Reabertura de Rol fechado** → não existe; para corrigir, cancelar (F06) e recriar
- **Dados de titularidade no evento** → responsabilidade da Distribuição buscar no Cadastro
- **Fechamento automático** quando todos os pendentes são resolvidos → sempre ação explícita do analista
- **Múltiplos eventos por fechamento** (ex: evento por execução) → um único evento com todas as execuções

---

## 6. Restrições Técnicas de Alto Nível

- **Outbox Pattern:** mesmo padrão do Cadastro (F08) — evento salvo na tabela outbox na mesma transação do fechamento, publicado assincronamente pelo Outbox Worker
- **CloudEvents:** formato padrão de evento (type, source, subject, data)
- **RabbitMQ:** routing key `identificacao.rol.fechado`
- **Validação de pré-requisitos:** requer consulta ao Cadastro para verificar status das obras/fonogramas referenciadas (pode ser pesado para captações grandes)
- **Atomicidade:** fechamento + criação do evento outbox na mesma transação de banco

---

## 7. Riscos e Premissas

### Premissas
- O Outbox Pattern (tabela + worker + RabbitMQ) seguirá o mesmo padrão já implementado no Cadastro
- A consulta ao Cadastro para validar status de obras/fonogramas é feita via CadastroHttpClient (F02)
- O payload do evento é suficiente para a Distribuição iniciar o processamento (complementado com dados do Cadastro quando necessário)

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Validação de pré-requisitos lenta para captações com 10.000+ execuções (consulta ao Cadastro por obra) | Alta | Médio | Batch de consultas por IDs únicos (não repetir para mesma obra), cache em memória durante a validação |
| Cadastro API indisponível durante validação de fechamento | Média | Alto | Retornar erro claro: "Não foi possível verificar status das obras no Cadastro. Tente novamente" |
| Evento outbox não publicado (RabbitMQ indisponível) | Baixa | Médio | Retry automático do Outbox Worker (até 10x), alerta se exceder |

---

## 8. Rastreabilidade

### Vision Doc
- **Fase:** 2 — Identificação + Arrecadação
- **Domínio:** D02 — Identificação
- **Critério de conclusão da Fase 2:** "fechar o Rol do período"

### Domain Doc (`domains/identificacao/domain.md`)
- **Feature:** F05 — Fechamento do Rol
- **Regras de negócio:** RN-04 (imutabilidade), RN-08 (propriedade), RN-12 (campos condicionais audiovisual)
- **Evento:** `identificacao.rol.fechado`
- **Questão resolvida:** "O fechamento deve ser bloqueado com pendentes" → Sim, bloqueado

---

## 9. Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para API Contract e TechSpec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar o API Contract, use a skill `flow-contract-creator`. Para gerar a Especificação Técnica, use a skill `flow-techspec-creator`.*
