# Resumo de Tarefas — F04: Titularidades Autorais

## Visão Geral

Implementação das Titularidades Autorais — vínculo titular↔obra com categoria e percentual, soma=100%, depuração em obra LIBERADA, autocomplete de titulares e integração com ISWC (F03). São 13 tarefas em 3 lanes paralelas.

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `dotnet-architecture` | Entidade de junção, CQRS, Repository |
| `dotnet-code-quality` | FluentValidation, validação Editor=PJ |
| `dotnet-testing` | xUnit AAA, Moq, Testcontainers |
| `react-architecture` | Feature sem páginas, integração na ObraDetailPage |
| `frontend-design` | Autocomplete, SomaIndicator, DESIGN.md |
| `common/restful-api` | Sub-resources, ProblemDetails |

## Fases de Implementação

### Fase 1 — Domain + Infra + Design (Tasks 1-3, 7-8)
Entidade, migration, repository, fix PossuiVinculos, Stitch mockups, shared Autocomplete.

### Fase 2 — Application + Frontend Core (Tasks 4-5, 9-10)
Queries, Commands, types/API/hooks, componentes feature.

### Fase 3 — Integração + Testes (Tasks 6, 11-13)
Endpoints, integrações F03, testes, composição final.

## Tarefas

### Lane A — Backend (.NET 8)
- [ ] 1.0 Domain: TitularidadeAutoral, CategoriaAutoral, ITitularidadeRepository
- [ ] 2.0 Infra: Configuration, Migration, TitularidadeRepository
- [ ] 3.0 Infra Fix: PossuiVinculosAsync em ObraRepository e TitularRepository
- [ ] 4.0 Application: Queries (ListarTitularidades, BuscarTitulares) + Responses
- [ ] 5.0 Application: Commands (Adicionar, Editar, Remover) + Validators
- [ ] 6.0 API: TitularidadeEndpoints + Program.cs + Fix ObterIswcHandler
- [ ] 7.0 Testes Backend: Unitários + Integração

### Lane B — Frontend Design
- [ ] 8.0 Stitch: 4 Mockups (seção titulares vazia/preenchida, autocomplete, soma)

### Lane C — Frontend Dev (React)
- [ ] 9.0 Shared: Autocomplete + apiDeleteWithBody
- [ ] 10.0 Feature: Types + API + Hooks (5 hooks)
- [ ] 11.0 Feature: Componentes (Table, AddForm, EditModal, SomaIndicator)
- [ ] 12.0 Feature: TitularidadesSection + Integração ObraDetailPage
- [ ] 13.0 Integração: IswcSection temTitulares real

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|---|---|---|
| HU-01 (Adicionar titular autoral) | 1.0, 5.0, 6.0, 10.0, 11.0, 12.0 | Direta |
| HU-02 (Visualizar soma) | 4.0, 11.0, 12.0 | Direta |
| HU-03 (Editar percentual) | 1.0, 5.0, 6.0, 11.0, 12.0 | Direta |
| HU-04 (Remover titular) | 5.0, 6.0, 11.0, 12.0 | Direta |
| HU-05 (Depuração ao alterar) | 5.0, 6.0, 12.0 | Direta |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---|---|
| RF-01 (adicionar titularidade) | 1.0, 5.0, 6.0, 11.0 | ✅ |
| RF-02 (autocomplete) | 4.0, 6.0, 9.0, 11.0 | ✅ |
| RF-03 (Editor exige PJ) | 5.0, 11.0 | ✅ |
| RF-04 (4 casas decimais) | 1.0, 5.0 | ✅ |
| RF-05 (acúmulo papéis) | 1.0, 2.0 | ✅ |
| RF-06 (duplicata proibida) | 2.0, 5.0 | ✅ |
| RF-07 (soma exibida) | 4.0, 11.0 | ✅ |
| RF-08 (soma temporária !=100%) | 5.0 | ✅ |
| RF-09 (indicador cor) | 11.0 | ✅ |
| RF-10 (LIBERADO requer 100%) | N/A — F07 | ✅ |
| RF-11 (arredondamento RN-12) | 1.0 | ✅ |
| RF-12 (editar percentual) | 1.0, 5.0, 11.0 | ✅ |
| RF-13 (categoria imutável) | 5.0 | ✅ |
| RF-14 (soma recalculada) | 4.0, 5.0 | ✅ |
| RF-15 (remover) | 5.0, 6.0 | ✅ |
| RF-16 (soma recalculada remoção) | 4.0, 5.0 | ✅ |
| RF-17 (soma 0% sem titulares) | 4.0 | ✅ |
| RF-18 (tabela com dados) | 11.0 | ✅ |
| RF-19 (soma no rodapé) | 11.0 | ✅ |
| RF-20 (read-only DEPURADA) | 12.0 | ✅ |
| RF-21 (depuração LIBERADA) | 5.0, 12.0 | ✅ |
| RF-22 (modal depuração) | 12.0 | ✅ |
| RF-23 (titularidades copiadas) | 5.0, 6.0 | ✅ |
| RF-24 (cancelar depuração) | 12.0 | ✅ |
| RF-25 (ISWC habilitado) | 13.0 | ✅ |
| RF-26 (autores para ISWC) | 6.0 | ✅ |
| RF-27 (associação maior %) | 6.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|---|---|---|
| 1 | Setup / Configuração | 6.0 (Program.cs) | ✅ |
| 2 | Modelos de Dados | 1.0, 2.0 | ✅ |
| 3 | Lógica de Negócio | 5.0, 6.0 | ✅ |
| 4 | Endpoints / Interfaces | 6.0 | ✅ |
| 5 | Integrações Externas | N/A — sem novas integrações | ✅ |
| 6 | Validações e Erros | 5.0 (Editor=PJ, duplicata, depuração) | ✅ |
| 7 | Testes | 7.0 | ✅ |
| 8 | Observabilidade | 6.0 (logging) | ✅ |
| 9 | Documentação | 8.0 (Stitch) | ✅ |
| 10 | Segurança | N/A — auth retroativa | ✅ |

## Análise de Paralelização

### Diagrama de Dependências

```
Lane A (Backend)                   Lane B        Lane C (Frontend)

[1.0 Domain]                       [8.0 Stitch]  [9.0 Autocomplete+apiClient]
    ↓                                                    ↓
[2.0 Infra] ║ [3.0 Fix Vínculos]              [10.0 Types+API+Hooks]
    ↓              ↓                                     ↓
[4.0 Queries] ║ [5.0 Commands]                 [11.0 Componentes]
    ↓               ↓                                    ↓
[6.0 API + Fix ISWC] ·······→ (integração) ← [12.0 Section + ObraDetail]
    ↓                                                    ↓
[7.0 Testes]                                  [13.0 IswcSection fix]
```
