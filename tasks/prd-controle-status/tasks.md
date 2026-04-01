# Resumo de Tarefas — F07: Controle de Status

## Visão Geral

Implementação do Controle de Status — liberação com validação de pré-requisitos, bloqueio com justificativa, desbloqueio, transição automática fonograma, campo urlAudio e histórico de bloqueios. Feature predominantemente de extensão. São 14 tarefas em 3 lanes paralelas.

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `dotnet-architecture` | Domain Services validadores, Commands de transição |
| `dotnet-code-quality` | PreRequisitosException, FluentValidation |
| `dotnet-testing` | Cenários paramétricos de validação |
| `react-architecture` | Extensão de features existentes, shared components |
| `frontend-design` | Botões de ação, banner bloqueio, checklist |
| `common/restful-api` | Sub-resources de ação, 422 com pendencias |

## Fases de Implementação

### Fase 1 — Domain + Infra + Design (Tasks 1-4, 8)
Enums, entidades estendidas, domain services, migration, Stitch.

### Fase 2 — Application + Frontend Core (Tasks 5-7, 9-11)
Commands, queries, fix handlers, shared components, hooks, types/API.

### Fase 3 — Integração (Tasks 12-14)
Endpoints, integração ObraDetailPage, integração FonogramaDetailPage.

## Tarefas

### Lane A — Backend (.NET 8)
- [ ] 1.0 Domain: Enums +Bloqueado, HistoricoBloqueio, PreRequisito record, IHistoricoBloqueioRepository
- [ ] 2.0 Domain: Extensão ObraMusical (Liberar, Bloquear, Desbloquear, BloqueioJustificativa) + ValidadorLiberacaoObra
- [ ] 3.0 Domain: Extensão Fonograma (UrlAudio, Liberar, Bloquear, Desbloquear, transições) + ValidadorLiberacaoFonograma
- [ ] 4.0 Infra: HistoricoBloqueioConfiguration, Migration, Repository + atualizar Configurations existentes
- [ ] 5.0 Application: Commands Obra (Liberar, Bloquear, Desbloquear) + PreRequisitosException + Responses
- [ ] 6.0 Application: Commands Fonograma (Liberar, Bloquear, Desbloquear) + Query Histórico
- [ ] 7.0 Application Fix: CalcularPercentuaisHandler (transição automática) + AtualizarFonogramaHandler (urlAudio) + Responses existentes
- [x] 8.0 API: StatusEndpoints (8 endpoints) + Program.cs + GlobalExceptionHandler + Testes

### Lane B — Frontend Design
- [x] 9.0 Stitch: 7 Mockups no projeto mcad

### Lane C — Frontend Dev (React)
- [x] 10.0 Shared: 5 novos UI components (StatusActions, BloqueioModal, BloqueioBanner, Checklist, Histórico)
- [x] 11.0 Feature: Types estendidos + API (8 funções novas) + Hooks (8 novos)
- [x] 12.0 Feature: FonogramaForm +urlAudio + FonogramaDetailPage integração
- [x] 13.0 Feature: ObraDetailPage integração (botões + banner + checklist + histórico)

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|---|---|---|
| HU-01 (Liberar obra) | 2.0, 5.0, 8.0, 11.0, 13.0 | Direta |
| HU-02 (Bloquear obra) | 1.0, 2.0, 5.0, 8.0, 10.0, 11.0, 13.0 | Direta |
| HU-03 (Liberar fonograma) | 3.0, 6.0, 8.0, 11.0, 12.0 | Direta |
| HU-04 (URL áudio) | 3.0, 7.0, 11.0, 12.0 | Direta |
| HU-05 (Desbloquear) | 2.0, 3.0, 5.0, 6.0, 8.0, 11.0, 12.0, 13.0 | Direta |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---|---|
| RF-01 (botão Liberar obra) | 2.0, 5.0, 8.0, 13.0 | ✅ |
| RF-02 (valida pré-requisitos) | 2.0, 5.0 | ✅ |
| RF-03 (status → LIBERADO) | 2.0, 5.0 | ✅ |
| RF-04 (lista pendências) | 5.0, 8.0, 10.0, 13.0 | ✅ |
| RF-05 (obra independe fonogramas) | 5.0 | ✅ |
| RF-06 (botão Bloquear) | 2.0, 5.0, 10.0, 13.0 | ✅ |
| RF-07 (justificativa obrigatória) | 5.0, 10.0 | ✅ |
| RF-08 (status → BLOQUEADO) | 2.0, 5.0 | ✅ |
| RF-09 (BLOQUEADO não editável) | 2.0, 13.0 | ✅ |
| RF-10 (justificativa visível) | 10.0, 13.0 | ✅ |
| RF-11 (botão Desbloquear) | 2.0, 5.0, 10.0, 13.0 | ✅ |
| RF-12 (→ PENDENTE) | 2.0, 5.0 | ✅ |
| RF-13 (registro desbloqueio) | 1.0, 5.0 | ✅ |
| RF-14 (botão Liberar fonograma) | 3.0, 6.0, 12.0 | ✅ |
| RF-15 (valida pré-requisitos fono) | 3.0, 6.0 | ✅ |
| RF-16 (status → LIBERADO fono) | 3.0, 6.0 | ✅ |
| RF-17 (lista pendências fono) | 6.0, 10.0, 12.0 | ✅ |
| RF-18 (obra LIBERADA requerida) | 6.0 | ✅ |
| RF-19 (transição automática → PENDENTE_DOC) | 7.0 | ✅ |
| RF-20 (retorna PENDENTE_VAL) | 7.0 | ✅ |
| RF-21-25 (urlAudio) | 3.0, 7.0, 12.0 | ✅ |
| RF-26-30 (bloquear fonograma) | 3.0, 6.0, 10.0, 12.0 | ✅ |
| RF-31-33 (histórico) | 1.0, 4.0, 5.0, 6.0, 10.0, 12.0, 13.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|---|---|---|
| 1 | Setup / Configuração | 8.0 (Program.cs) | ✅ |
| 2 | Modelos de Dados | 1.0, 4.0 | ✅ |
| 3 | Lógica de Negócio | 2.0, 3.0, 5.0, 6.0 | ✅ |
| 4 | Endpoints / Interfaces | 8.0 | ✅ |
| 5 | Integrações Externas | N/A | ✅ |
| 6 | Validações e Erros | 2.0, 3.0, 5.0, 6.0 | ✅ |
| 7 | Testes | 8.0 | ✅ |
| 8 | Observabilidade | 8.0 (logging) | ✅ |
| 9 | Documentação | 9.0 (Stitch) | ✅ |
| 10 | Segurança | N/A — auth retroativa | ✅ |

## Análise de Paralelização

### Diagrama de Dependências

```
Lane A (Backend)                   Lane B        Lane C (Frontend)

[1.0 Domain Enums+Histórico]       [9.0 Stitch]  [10.0 Shared Components]
    ↓                                                    ↓
[2.0 Extensão Obra] ║ [3.0 Extensão Fonograma]  [11.0 Types+API+Hooks]
    ↓                      ↓                             ↓
[4.0 Infra]                                     [12.0 FonogramaDetail] ║ [13.0 ObraDetail]
    ↓
[5.0 Cmds Obra] ║ [6.0 Cmds Fono] ║ [7.0 Fix Handlers]
    ↓                  ↓                ↓
[8.0 API + Testes] ·············→ (integração)
```
