# PRD — F06: Participação Conexa Automática

> **Domínio:** Cadastro (D01)
> **Feature ID:** F06
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-04-01

---

## Visão Geral

Participações Conexas representam o vínculo entre titulares e fonogramas — definindo quem participou de cada gravação e em qual papel (Intérprete, Produtor Fonográfico, Músico Executante). Diferente das Titularidades Autorais (F04) onde os percentuais são livres, aqui os **percentuais são calculados automaticamente** pelo sistema conforme o Regulamento de Distribuição do ECAD, com possibilidade de ajuste manual limitado.

O sistema segue a regra de 3 fatias: **43,7% Intérprete / 41,7% Produtor / 14,6% Músicos** (com músicos) ou **50% / 50%** (sem músicos). O Analista monta a composição de participantes, clica "Calcular", o sistema sugere percentuais conforme as regras, e o Analista pode ajustar intérpretes e produtores (músicos são sempre igualitários). Recálculo sobrescreve ajustes manuais com alerta de confirmação.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Cálculo correto conforme Regulamento | 100% dos fonogramas calculados seguem split 43,7/41,7/14,6 ou 50/50 |
| Ao menos 1 Intérprete e 1 Produtor | Zero fonogramas LIBERADOS sem as categorias obrigatórias |
| Arredondamento fecha 100% | Soma de todas as participações = 100.0000% exatamente |
| Ajuste manual preservado até recálculo | Analista pode customizar intérpretes/produtores sem recálculo automático |

---

## Histórias de Usuário

### HU-01 — Montar composição de participantes
**Como** Analista de Cadastro,
**eu quero** adicionar titulares conexos (intérpretes, produtores, músicos) a um fonograma,
**para que** a composição de participantes fique registrada antes do cálculo.

### HU-02 — Calcular percentuais automaticamente
**Como** Analista de Cadastro,
**eu quero** clicar "Calcular" para que o sistema distribua automaticamente os percentuais conforme as regras do ECAD,
**para que** eu não precise calcular manualmente os splits 43,7/41,7/14,6.

### HU-03 — Ajustar percentuais de intérpretes e produtores
**Como** Analista de Cadastro,
**eu quero** ajustar manualmente os percentuais sugeridos de intérpretes e produtores,
**para que** casos especiais (feat com peso maior para artista principal) sejam contemplados.

### HU-04 — Recalcular após mudança de composição
**Como** Analista de Cadastro,
**eu quero** recalcular os percentuais após adicionar ou remover um participante,
**para que** os splits sejam atualizados conforme a nova composição, mesmo que eu perca ajustes manuais.

### HU-05 — Depuração ao alterar participações de fonograma LIBERADO
**Como** sistema,
**eu preciso** disparar depuração quando participações conexas de um fonograma LIBERADO são alteradas,
**para que** o histórico da gravação original com ISRC seja preservado.

---

## Funcionalidades Principais

### 1. Adicionar Participante Conexo

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | Na tela de detalhe do fonograma, seção "Participações Conexas", o Analista pode adicionar um participante: busca titular existente via autocomplete (reutiliza `/titulares/busca` de F04), seleciona categoria (Intérprete, Produtor Fonográfico, Músico Executante) | Must Have |
| RF-02 | Um mesmo titular pode ter múltiplas categorias no mesmo fonograma (ex: Ed Motta como Intérprete + Produtor + Músico) (RN-07) | Must Have |
| RF-03 | Não permitir duplicata de mesmo titular + mesma categoria no mesmo fonograma | Must Have |
| RF-04 | Ao adicionar, o participante aparece na lista SEM percentual (aguardando "Calcular") | Must Have |
| RF-05 | Se o fonograma já tem percentuais calculados e o Analista adiciona um novo participante, exibir indicador "Percentuais desatualizados — clique Calcular" | Should Have |

**Critérios de Aceitação — RF-02:**
- **Given** fonograma já tem "Ed Motta" como Intérprete
- **When** o Analista adiciona "Ed Motta" como Músico Executante
- **Then** o sistema aceita — Ed Motta aparece 2x com categorias distintas

### 2. Remover Participante Conexo

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-06 | O Analista pode remover um participante da composição | Must Have |
| RF-07 | Após remoção, exibir indicador "Percentuais desatualizados" (se havia cálculo anterior) | Should Have |

### 3. Calcular Percentuais (Botão "Calcular")

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-08 | Botão "Calcular" visível na seção de participações | Must Have |
| RF-09 | Botão habilitado apenas se há ao menos um Intérprete E um Produtor Fonográfico (RN-03, RN-09) | Must Have |
| RF-10 | **Com músico executante:** sistema calcula: fatia intérprete = 43,7%, fatia produtor = 41,7%, fatia músico = 14,6% do total | Must Have |
| RF-11 | **Sem músico executante:** sistema calcula: fatia intérprete = 50%, fatia produtor = 50% | Must Have |
| RF-12 | **Múltiplos intérpretes:** fatia de 43,7% (ou 50%) dividida igualmente entre N intérpretes | Must Have |
| RF-13 | **Múltiplos produtores:** fatia de 41,7% (ou 50%) dividida igualmente entre N produtores | Must Have |
| RF-14 | **Múltiplos músicos:** fatia de 14,6% dividida igualmente entre N músicos | Must Have |
| RF-15 | Arredondamento conforme RN-12: truncar para 4 casas decimais por participante, diferença atribuída ao primeiro participante de cada fatia | Must Have |
| RF-16 | Após calcular, percentuais aparecem na tabela e soma total = 100.0000% | Must Have |

**Critérios de Aceitação — RF-10 (cenário padrão):**
- **Given** fonograma com: Djavan (Intérprete), EMI (Produtor), Tasso (Músico), Músico2, Músico3, Músico4
- **When** o Analista clica "Calcular"
- **Then** percentuais: Djavan=43.7000%, EMI=41.7000%, cada músico=3.6500% (14.6% ÷ 4)

**Critérios de Aceitação — RF-11 (sem músicos):**
- **Given** fonograma com: Djavan (Intérprete), EMI (Produtor), sem músicos
- **When** clica "Calcular"
- **Then** Djavan=50.0000%, EMI=50.0000%

**Critérios de Aceitação — RF-12 (dueto):**
- **Given** fonograma com: Anitta (Intérprete), J Balvin (Intérprete), EMI (Produtor), 2 Músicos
- **When** clica "Calcular"
- **Then** Anitta=21.8500%, J Balvin=21.8500% (43.7% ÷ 2), EMI=41.7000%, cada músico=7.3000% (14.6% ÷ 2)

**Critérios de Aceitação — RF-15 (arredondamento):**
- **Given** 3 músicos → 14.6% ÷ 3 = 4.8666...%
- **When** trunca para 4 casas
- **Then** Músico1=4.8668%, Músico2=4.8666%, Músico3=4.8666% (diferença 0.0002 no primeiro)

### 4. Ajuste Manual de Percentuais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-17 | Após "Calcular", o Analista pode editar manualmente o percentual de cada Intérprete | Must Have |
| RF-18 | Após "Calcular", o Analista pode editar manualmente o percentual de cada Produtor | Must Have |
| RF-19 | Percentuais de Músicos NÃO são editáveis manualmente (sempre igualitários) | Must Have |
| RF-20 | Ao editar, o sistema valida: soma de todos os intérpretes = 100% da fatia intérprete (RN-13) | Must Have |
| RF-21 | Ao editar, o sistema valida: soma de todos os produtores = 100% da fatia produtor (RN-13) | Must Have |
| RF-22 | Indicador visual: se a soma de uma fatia não fecha 100%, exibir aviso | Should Have |

**Critérios de Aceitação — RF-17:**
- **Given** dueto: Anitta=21.85%, J Balvin=21.85% (calculado igualitário)
- **When** Analista edita Anitta para 30.00% e J Balvin para 13.70%
- **Then** soma intérpretes = 43.70% (100% da fatia) → aceito

### 5. Recálculo com Alerta

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-23 | Se já existem percentuais (calculados ou ajustados) e o Analista clica "Calcular", exibir alerta: "Os percentuais serão recalculados. Ajustes manuais serão perdidos. Continuar?" | Must Have |
| RF-24 | Ao confirmar: recalcula tudo do zero conforme composição atual | Must Have |
| RF-25 | Ao cancelar: nenhuma alteração | Must Have |

### 6. Depuração em Fonograma LIBERADO

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-26 | Em fonograma LIBERADO, qualquer operação de participação conexa (adicionar, remover, calcular, editar percentual) dispara confirmação de depuração | Must Have |
| RF-27 | Ao confirmar: fonograma original → DEPURADO, novo fonograma criado → PENDENTE_VALIDACAO (mesma obra, participações copiadas com alterações) | Must Have |
| RF-28 | Reutiliza endpoint `POST /fonogramas/{id}/depurar` de F05 | Must Have |

### 7. Listar e Visualizar

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-29 | Seção exibe tabela: nome do titular, tipo (PF/PJ badge), documento (mono), categoria (Intérprete/Produtor/Músico), percentual (mono 4 casas), indicador se editável | Must Have |
| RF-30 | Soma total exibida no rodapé (verde=100%, amarelo!=100%) | Must Have |
| RF-31 | Para fonogramas DEPURADOS, tudo read-only | Must Have |
| RF-32 | Se percentuais ainda não calculados, exibir "—" na coluna percentual e "Pendente" na soma | Must Have |

### 8. Validações de Composição

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-33 | O botão "Calcular" exige: mínimo 1 Intérprete + 1 Produtor. Se faltam, tooltip indica o que falta. | Must Have |
| RF-34 | Fonograma não pode ser LIBERADO sem participações calculadas com soma = 100% (validação F07) | Must Have |

---

## Experiência do Usuário

### Fluxo Principal — Calcular participações
1. Analista acessa detalhe do fonograma (PENDENTE)
2. Na seção "Participações Conexas", clica "Adicionar Participante"
3. Busca titular via autocomplete, seleciona categoria → participante adicionado (sem percentual)
4. Repete para cada participante
5. Quando composição completa (≥1 intérprete + ≥1 produtor), clica **"Calcular"**
6. Sistema preenche percentuais automaticamente conforme regras
7. Analista revisa e opcionalmente ajusta intérpretes/produtores
8. Soma exibida: 100.0000% verde

### Fluxo — Recálculo
1. Analista adiciona novo participante → indicador "Percentuais desatualizados"
2. Clica "Calcular" → alerta "Ajustes manuais serão perdidos. Continuar?"
3. Confirma → recalcula tudo do zero
4. Cancela → mantém percentuais anteriores

### Fluxo — Depuração
1. Analista acessa fonograma LIBERADO
2. Tenta adicionar/remover participante ou recalcular
3. Modal depuração: "Alterar participações irá depurar este fonograma..."
4. Confirma → original DEPURADO, novo criado com participações atualizadas

### Considerações de UI
- Seção integrada na `FonogramaDetailPage` (mesmo padrão de F04 na obra)
- Autocomplete reutiliza `/titulares/busca` (mesmo de F04)
- Percentuais de Músicos exibidos com ícone de cadeado (não editáveis)
- Percentuais de Intérpretes/Produtores editáveis inline (click → input)
- Botão "Calcular" destacado (primary) quando composição está completa
- Indicador "Percentuais desatualizados" como badge warning
- Soma no rodapé: mesma SomaIndicator de F04 (verde/amarelo/vermelho)
- Consultor: read-only

---

## Restrições Técnicas de Alto Nível

- Participações são sub-recurso de Fonograma: `/api/v1/fonogramas/{fonogramaId}/participacoes`
- Percentuais com precisão DECIMAL(8,4) — 4 casas
- Cálculo de percentuais no backend (não confiar apenas no frontend)
- Algoritmo de arredondamento RN-12 implementado no Domain Layer
- Tabela `participacoes_conexas` no schema `cadastro` com FKs para fonogramas e titulares

---

## Não-Objetivos (Fora de Escopo)

- Não permite ajuste manual de percentual de músicos (sempre igualitário)
- Não transiciona status automaticamente para LIBERADO (F07)
- Não recalcula automaticamente ao adicionar/remover (requer botão "Calcular")
- Não preserva ajustes manuais após recálculo (sobrescreve com alerta)
- Não cria titulares inline (busca existentes via F02)

---

## Rastreabilidade

### Domain Doc (Cadastro — D01)
- **Feature:** F06 — Participação Conexa Automática
- **Entidade:** Participação Conexa
- **Regras referenciadas:** RN-03 (Produtor obrigatório), RN-04 (cálculo automático 43,7/41,7/14,6 ou 50/50), RN-07 (acúmulo papéis), RN-09 (Intérprete obrigatório, múltiplos), RN-12 (arredondamento), RN-13 (soma fatia = 100%), RN-15 (múltiplos produtores configurável)
- **Dependências:** Upstream: F02 (Titulares), F05 (Fonogramas + depuração); Downstream: F07 (Status — LIBERADO requer conexos 100%)

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para API Contract e Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`.*

---

## Atualização Pós-Análise de Código

> Anexo acrescentado após análise da implementação. O conteúdo original acima foi preservado sem alteração.

### Status Observado

| Item | Situação observada no código |
|------|------------------------------|
| Implementação backend | Implementada em `services/cadastro-api` com entidade, cálculo de domínio, repositório, comandos, query e endpoints |
| Implementação frontend | Implementada em `frontend/src/features/cadastro/participacoes` e integrada à `FonogramaDetailPage` na seção "Direitos Conexos" |
| Testes automatizados | Há testes unitários para entidade, cálculo e handlers, além de testes de integração dos endpoints |
| Evidência QA | Relatório consolidado em `qa-evidence/qa_report_consolidated.md` com 5/5 tasks PASS e 34/34 cenários PASS em API/DB |

### Comportamento Implementado Confirmado

| Área | Atualização |
|------|-------------|
| Endpoints | Foram disponibilizados `GET`, `POST`, `PUT`, `DELETE` e `POST /calcular` sob `/api/v1/fonogramas/{fonogramaId}/participacoes` |
| Permissões | As operações usam permissões granulares: listar, adicionar, ajustar, remover e calcular participações |
| Composição | O mesmo titular pode acumular categorias diferentes no mesmo fonograma; duplicidade de titular + categoria retorna conflito |
| Percentual pendente | Participação recém-adicionada permanece com `percentual=null`; a resposta retorna `somaCalculada=false` e `somaPercentual=null` enquanto houver percentual pendente |
| Cálculo | O backend calcula 43,7/41,7/14,6 quando há músico executante, 50/50 quando não há músico, e aplica truncamento a 4 casas com diferença no primeiro item da fatia |
| Recálculo | O frontend exibe modal de confirmação quando já há percentuais calculados; o backend recalcula sobrescrevendo os percentuais anteriores |
| Desatualização | Ao adicionar participante após cálculo ou remover participante calculado, `percentuaisDesatualizados=true` é retornado para a UI |
| Status do fonograma | Calcular percentuais transiciona o fonograma de `PENDENTE_VALIDACAO` para `PENDENTE_DOCUMENTACAO`; remover participação calculada retorna para `PENDENTE_VALIDACAO` |
| Liberação | A liberação de fonograma valida soma conexa igual a `100.0000`, obra vinculada liberada, ISRC e URL de áudio |
| Distribuição | A feature alimenta o snapshot de ownership consumido por Distribuição via `ObterOwnershipSnapshotQueryHandler` |
| Auditoria | Adição, ajuste, remoção e cálculo de participação conexa publicam eventos de auditoria para `ParticipacaoConexa` |

### Ajustes de Escopo Observados

| Ponto | Atualização |
|-------|-------------|
| Depuração de LIBERADO | Operações de participação em fonograma `LIBERADO` retornam `DEPURACAO_NECESSARIA`. A criação efetiva do novo fonograma continua concentrada no endpoint de depuração de F05 |
| Novo fonograma depurado | A evidência QA mostra que o novo fonograma criado pela depuração inicia em `PENDENTE_VALIDACAO` sem copiar participações do original; o analista precisa cadastrar as participações no novo fonograma |
| Body de depuração | `POST /fonogramas/{id}/depurar` exige body com ISRC, país de origem e datas, por reutilizar o contrato de F05 |
| Serialização de percentuais | A API pode serializar `43.7` em vez de `43.7000`; a persistência mantém `DECIMAL(8,4)` no banco |

### Lacunas ou Pontos de Atenção

| Requisito original | Situação observada |
|--------------------|--------------------|
| RF-20/RF-21 — validar soma da fatia de intérpretes/produtores no ajuste manual | A análise do handler de ajuste não encontrou validação de soma por fatia no momento do `PUT`; o backend valida intervalo `0.0001..100`, bloqueia músico e a liberação barra soma total diferente de 100 |
| RF-22 — indicador visual de soma por fatia | A UI implementa indicador de soma total com `SomaIndicator`; não foi identificado indicador separado para fechamento de fatia de intérpretes ou produtores |
| RF-27 — novo fonograma com participações copiadas com alterações | A evidência QA documenta comportamento diferente: o novo fonograma depurado nasce sem participações copiadas |

### Critérios de Aceitação Atualizados

| Critério | Evidência atual |
|----------|-----------------|
| Montar composição | PASS nos testes QA de composição, incluindo mesmo titular com categorias distintas e bloqueio de duplicata |
| Calcular percentuais | PASS em cenários com músico, sem músico, dueto, três músicos e composição incompleta |
| Ajustar percentuais | PASS para intérprete/produtor e rejeição de músico |
| Recalcular | PASS com descarte de ajustes manuais e recomposição igualitária |
| Depuração | PASS para bloqueio das operações em LIBERADO e confirmação do fluxo via endpoint de depuração |

### Rastreabilidade de Código

| Responsabilidade | Artefato principal |
|------------------|--------------------|
| Entidade | `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/ParticipacaoConexa.cs` |
| Cálculo | `services/cadastro-api/3-Domain/Cadastro.Domain/Services/CalculadoraConexos.cs` |
| Endpoints | `services/cadastro-api/1-Services/Cadastro.API/Endpoints/ParticipacaoEndpoints.cs` |
| Liberação do fonograma | `services/cadastro-api/2-Application/Cadastro.Application/Status/Commands/LiberarFonogramaCommand.cs` |
| Snapshot Distribuição | `services/cadastro-api/2-Application/Cadastro.Application/Distribuicao/Queries/ObterOwnershipSnapshotQueryHandler.cs` |
| UI | `frontend/src/features/cadastro/participacoes/components/ParticipacoesSection.tsx` |
| Integração na página | `frontend/src/features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` |
