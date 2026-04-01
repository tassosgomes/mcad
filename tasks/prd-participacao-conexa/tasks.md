# Resumo de Tarefas — F06: Participação Conexa Automática

## Visão Geral

Implementação das Participações Conexas com cálculo automático de percentuais (43,7/41,7/14,6 ou 50/50), ajuste manual intérpretes/produtores, arredondamento RN-12, e integração com depuração de fonogramas. São 14 tarefas em 3 lanes paralelas.

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `dotnet-architecture` | Domain Service, entidade de junção, CQRS |
| `dotnet-code-quality` | FluentValidation, algoritmo de arredondamento |
| `dotnet-testing` | xUnit AAA — cenários paramétricos CalculadoraConexos |
| `react-architecture` | Feature sem páginas, integração FonogramaDetailPage |
| `frontend-design` | Inline edit, cadeado, DesatualizadoBadge |
| `common/restful-api` | Sub-resources, ProblemDetails |

## Fases de Implementação

### Fase 1 — Domain + Infra + Design (Tasks 1-4, 8)
Entidade, Domain Service, migration, repository, Stitch mockups.

### Fase 2 — Application + Frontend Core (Tasks 5-6, 9-11)
Queries, Commands, types/API/hooks, componentes.

### Fase 3 — Integração + Testes (Tasks 7, 12-14)
Endpoints, testes, composição, integração FonogramaDetailPage.

## Tarefas

### Lane A — Backend (.NET 8)
- [ ] 1.0 Domain: ParticipacaoConexa, CategoriaConexo, IParticipacaoRepository
- [ ] 2.0 Domain: CalculadoraConexos (Domain Service) — algoritmo de cálculo
- [ ] 3.0 Domain Fix: Fonograma + PercentuaisDesatualizados
- [ ] 4.0 Infra: Configuration, Migration, ParticipacaoRepository + Fix TitularRepository
- [ ] 5.0 Application: Queries (ListarParticipacoes) + Responses
- [ ] 6.0 Application: Commands (Adicionar, AjustarPercentual, Remover, Calcular)
- [ ] 7.0 API: ParticipacaoEndpoints (5 endpoints) + Program.cs + Testes

### Lane B — Frontend Design
- [ ] 8.0 Stitch: 6 Mockups no projeto mcad

### Lane C — Frontend Dev (React)
- [ ] 9.0 Feature: Types + API (5 funções) + Hooks (5 hooks)
- [ ] 10.0 Feature: Componentes Simples (AddForm, CalcularButton, DesatualizadoBadge, RecalcularModal)
- [ ] 11.0 Feature: ParticipacoesTable (inline edit + cadeado)
- [ ] 12.0 Feature: SomaIndicator fix (prop pendente) + ParticipacoesSection
- [ ] 13.0 Integração: FonogramaDetailPage

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|---|---|---|
| HU-01 (Montar composição) | 1.0, 6.0, 7.0, 9.0, 10.0, 12.0 | Direta |
| HU-02 (Calcular percentuais) | 2.0, 6.0, 7.0, 9.0, 10.0, 12.0 | Direta |
| HU-03 (Ajustar intérpretes/produtores) | 1.0, 6.0, 7.0, 9.0, 11.0 | Direta |
| HU-04 (Recalcular após mudança) | 2.0, 3.0, 6.0, 10.0, 12.0 | Direta |
| HU-05 (Depuração LIBERADO) | 6.0, 12.0, 13.0 | Direta |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---|---|
| RF-01 (adicionar participante) | 1.0, 6.0, 10.0 | ✅ |
| RF-02 (acúmulo papéis) | 1.0, 4.0 | ✅ |
| RF-03 (duplicata proibida) | 4.0, 6.0 | ✅ |
| RF-04 (sem % ao adicionar) | 1.0, 11.0 | ✅ |
| RF-05 (desatualizado) | 3.0, 10.0 | ✅ |
| RF-06 (remover) | 6.0, 11.0 | ✅ |
| RF-07 (desatualizado após remoção) | 3.0, 6.0 | ✅ |
| RF-08 (botão Calcular) | 2.0, 6.0, 10.0 | ✅ |
| RF-09 (mín 1 intérprete + 1 produtor) | 2.0, 6.0, 10.0 | ✅ |
| RF-10 (com músico 43,7/41,7/14,6) | 2.0 | ✅ |
| RF-11 (sem músico 50/50) | 2.0 | ✅ |
| RF-12 (múltiplos intérpretes igualitário) | 2.0 | ✅ |
| RF-13 (múltiplos produtores igualitário) | 2.0 | ✅ |
| RF-14 (múltiplos músicos igualitário) | 2.0 | ✅ |
| RF-15 (arredondamento RN-12) | 2.0 | ✅ |
| RF-16 (soma 100%) | 2.0, 12.0 | ✅ |
| RF-17 (ajuste intérprete) | 1.0, 6.0, 11.0 | ✅ |
| RF-18 (ajuste produtor) | 1.0, 6.0, 11.0 | ✅ |
| RF-19 (músico não editável) | 1.0, 6.0, 11.0 | ✅ |
| RF-20 (soma fatia intérprete = 100%) | 6.0 | ✅ |
| RF-21 (soma fatia produtor = 100%) | 6.0 | ✅ |
| RF-22 (indicador soma fatia) | 11.0 | ✅ |
| RF-23 (alerta recálculo) | 10.0 | ✅ |
| RF-24 (confirma recálculo) | 10.0 | ✅ |
| RF-25 (cancela recálculo) | 10.0 | ✅ |
| RF-26 (depuração LIBERADO) | 6.0, 12.0 | ✅ |
| RF-27 (depuração transacional) | 6.0 | ✅ |
| RF-28 (reutiliza depurar) | 6.0, 7.0 | ✅ |
| RF-29 (tabela participações) | 11.0 | ✅ |
| RF-30 (soma no rodapé) | 12.0 | ✅ |
| RF-31 (read-only DEPURADO) | 12.0 | ✅ |
| RF-32 (pendente antes cálculo) | 12.0 | ✅ |
| RF-33 (tooltip composição incompleta) | 10.0 | ✅ |
| RF-34 (LIBERADO requer 100%) | N/A — F07 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|---|---|---|
| 1 | Setup / Configuração | 7.0 (Program.cs) | ✅ |
| 2 | Modelos de Dados | 1.0, 4.0 | ✅ |
| 3 | Lógica de Negócio | 2.0, 6.0 | ✅ |
| 4 | Endpoints / Interfaces | 7.0 | ✅ |
| 5 | Integrações Externas | N/A | ✅ |
| 6 | Validações e Erros | 1.0, 2.0, 6.0 | ✅ |
| 7 | Testes | 7.0 | ✅ |
| 8 | Observabilidade | 7.0 (logging) | ✅ |
| 9 | Documentação | 8.0 (Stitch) | ✅ |
| 10 | Segurança | N/A — auth retroativa | ✅ |

## Análise de Paralelização

### Diagrama de Dependências

```
Lane A (Backend)                   Lane B        Lane C (Frontend)

[1.0 Domain Entidade]              [8.0 Stitch]  [9.0 Types+API+Hooks]
    ↓                                                    ↓
[2.0 Domain Calculadora]                        [10.0 Comp Simples] ║ [11.0 Table inline]
    ↓                                                    ↓                ↓
[3.0 Fix Fonograma]                              [12.0 SomaFix + Section]
    ↓                                                    ↓
[4.0 Infra]                                      [13.0 FonogramaDetailPage]
    ↓
[5.0 Queries] ║ [6.0 Commands]
    ↓               ↓
[7.0 API + Testes] ·············→ (integração)
```
