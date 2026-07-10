# Resumo de Tarefas de Implementação — Cadastro Unificado de Repertório

## Visão Geral

Implementar a jornada única de Cadastro sem criar entidade persistente `Repertório`. A operação composta reutiliza as entidades de Cadastro, solicita ISWC antes da transação e confirma Titulares, Obra, vínculos, Fonogramas, auditoria e Outbox em um único commit local. O frontend mantém o wizard exclusivamente em memória.

## Skills de Stack Consultadas

| Skill | Caminho | Influência nas tasks |
|---|---|---|
| dotnet-architecture | `/home/tsgomes/.agents/skills/csharp/dotnet-architecture/SKILL.md` | Camadas numeradas, CQRS nativo, FluentValidation e `ProblemDetails`. |
| dotnet-dependency-config | `/home/tsgomes/.agents/skills/csharp/dotnet-dependency-config/SKILL.md` | EF Core/PostgreSQL, DI, UoW específico e Outbox. |
| dotnet-code-quality | `/home/tsgomes/.agents/skills/csharp/dotnet-code-quality/SKILL.md` | Records imutáveis, DI, exceções específicas e `CancellationToken`. |
| dotnet-testing | `/home/tsgomes/.agents/skills/csharp/dotnet-testing/SKILL.md` | xUnit, AwesomeAssertions, Moq, AAA e integração com PostgreSQL. |
| dotnet-observability | `/home/tsgomes/.agents/skills/csharp/dotnet-observability/SKILL.md` | Logs estruturados, scopes/traces e métricas de negócio. |
| dotnet-production-readiness | `/home/tsgomes/.agents/skills/csharp/dotnet-production-readiness/SKILL.md` | Sanitização LGPD, autorização e resiliência da dependência ISWC. |
| react-architecture | `/home/tsgomes/.agents/skills/react/react-architecture/SKILL.md` | Estrutura feature-based e API pública da feature. |
| react-code-quality | `/home/tsgomes/.agents/skills/react/react-code-quality/SKILL.md` | TypeScript strict, componentes pequenos e sem `any`. |
| react-testing | `/home/tsgomes/.agents/skills/react/react-testing/SKILL.md` | Vitest/RTL/MSW, AAA e queries semânticas. |
| react-observability | `/home/tsgomes/.agents/skills/react/react-observability/SKILL.md` | Não expor CPF/CNPJ ou estado do formulário em telemetria. |
| react-production-readiness | `/home/tsgomes/.agents/skills/react/react-production-readiness/SKILL.md` | Gating de permissão, erros amigáveis e verificações de build/teste. |

## Fases de Implementação

### Fase 1 — Fundamentos seguros do backend

Tarefas 1.0–3.0 estabelecem permissão, limite transacional, contratos e a orquestração de domínio.

### Fase 2 — Superfície HTTP e experiência do usuário

Tarefas 4.0–6.0 publicam a API, atualizam o contrato e entregam o wizard React.

### Fase 3 — Gate de entrega

Tarefa 7.0 consolida documentação, Contract Gate e a evidência dos fluxos críticos.

## Tarefas

- [x] 1.0 Preparar autorização e unidade de trabalho transacional do Cadastro
- [x] 2.0 Criar contratos, busca de titular e validação do caso de uso
- [x] 3.0 Implementar o handler atômico de registro e os testes unitários
- [x] 4.0 Expor endpoints compostos, erros HTTP e testes de integração
- [x] 5.0 Criar a base da feature React e a ação de entrada da jornada
- [x] 6.0 Implementar o wizard de repertório e seus testes de componente
- [x] 7.0 Executar o gate de contratos, documentar e validar o fluxo fim a fim

## Rastreabilidade HU → Tasks

| História | Tasks relacionadas | Cobertura |
|---|---|---|
| HU-01 — Cadastrar repertório completo | 1.0, 2.0, 3.0, 4.0, 5.0, 6.0 | Direta |
| HU-02 — Reutilizar titular existente | 2.0, 3.0, 4.0, 6.0 | Direta |
| HU-03 — Corrigir erros antes de gravar | 2.0, 4.0, 6.0 | Direta |
| HU-04 — Consultar o resultado | 4.0, 6.0, 7.0 | Direta |

## Validação de Cobertura

### Requisitos funcionais

| Requisito | Task(s) | Status |
|---|---|---|
| RF-01 | 5.0, 6.0 | ✅ Coberto |
| RF-02 | 6.0 | ✅ Coberto |
| RF-03 | 6.0 | ✅ Coberto |
| RF-04 | 2.0, 3.0, 6.0 | ✅ Coberto |
| RF-05 | 2.0, 4.0, 6.0 | ✅ Coberto |
| RF-06 | 2.0, 3.0, 6.0 | ✅ Coberto |
| RF-07 | 2.0, 3.0, 6.0 | ✅ Coberto |
| RF-08 | 2.0, 3.0, 6.0 | ✅ Coberto |
| RF-09 | 2.0, 3.0, 6.0 | ✅ Coberto |
| RF-10 | 3.0, 6.0 | ✅ Coberto |
| RF-11 | 2.0, 3.0, 4.0 | ✅ Coberto |
| RF-12 | 2.0, 3.0, 6.0 | ✅ Coberto |
| RF-13 | 3.0, 6.0 | ✅ Coberto |
| RF-14 | 2.0, 3.0, 6.0 | ✅ Coberto |
| RF-15 | 6.0 | ✅ Coberto |
| RF-16 | 3.0, 4.0 | ✅ Coberto |
| RF-17 | 3.0, 4.0, 6.0 | ✅ Coberto |
| RF-18 | 3.0, 4.0 | ✅ Coberto |
| RF-19 | 3.0, 4.0, 6.0 | ✅ Coberto |
| RF-20 | 1.0, 3.0, 4.0 | ✅ Coberto |
| RF-21 | 1.0, 3.0, 4.0 | ✅ Coberto |
| RF-22 | 1.0, 4.0, 5.0 | ✅ Coberto |
| RF-23 | 3.0, 4.0 | ✅ Coberto |

### Artefatos da TechSpec

| Artefato | Task | Status |
|---|---|---|
| `Repertorios/Commands/RegistrarRepertorioCommand.cs` | 2.0 | ✅ |
| `Repertorios/Commands/RegistrarRepertorioCommandValidator.cs` | 2.0 | ✅ |
| `Repertorios/Commands/RegistrarRepertorioCommandHandler.cs` | 3.0 | ✅ |
| `Repertorios/Queries/BuscarTitularPorDocumentoQuery.cs` | 2.0 | ✅ |
| `Repertorios/Queries/BuscarTitularPorDocumentoQueryHandler.cs` | 2.0 | ✅ |
| `Repertorios/Responses/CadastroRepertorioResponse.cs` | 2.0 | ✅ |
| `Repertorios/RepertorioIswcIndisponivelException.cs` | 2.0 | ✅ |
| `Cadastro.Domain/Interfaces/ICadastroUnitOfWork.cs` | 1.0 | ✅ |
| `Cadastro.Infra/Data/CadastroUnitOfWork.cs` | 1.0 | ✅ |
| `Cadastro.API/Endpoints/RepertorioEndpoints.cs` | 4.0 | ✅ |
| `RegistrarRepertorioCommandHandlerTests.cs` | 3.0 | ✅ |
| `RepertorioEndpointsTests.cs` | 4.0 | ✅ |
| `frontend/.../repertorio/types/repertorio.ts` | 5.0 | ✅ |
| `frontend/.../repertorio/api/repertorioApi.ts` | 5.0 | ✅ |
| `frontend/.../repertorio/hooks/useCadastroRepertorio.ts` | 5.0 | ✅ |
| `frontend/.../repertorio/components/RepertorioWizard.tsx` | 6.0 | ✅ |
| `TitularRepertorioSelector.tsx` | 6.0 | ✅ |
| `FonogramasRepertorioStep.tsx` | 6.0 | ✅ |
| `RevisaoRepertorioStep.tsx` | 6.0 | ✅ |
| `CadastroRepertorioPage.tsx` e CSS | 5.0, 6.0 | ✅ |
| `CadastroRepertorioPage.test.tsx` | 6.0 | ✅ |
| `Program.cs`, permissions, exception handler e seeds | 1.0, 4.0 | ✅ |
| rota, ObrasPage, OpenAPI e documentação | 4.0, 5.0, 7.0 | ✅ |

### Categorias obrigatórias

| # | Categoria | Task(s) / N/A | Skill | Status |
|---|---|---|---|---|
| 1 | Setup / Configuração | 1.0 | dotnet-dependency-config | ✅ |
| 2 | Modelos de dados | 1.0, 2.0 — sem migration por decisão da TechSpec | dotnet-architecture | ✅ |
| 3 | Lógica de negócio | 2.0, 3.0, 6.0 | dotnet-architecture | ✅ |
| 4 | Endpoints / interfaces | 2.0, 4.0, 5.0 | common/restful-api | ✅ |
| 5 | Integrações externas | 3.0 | dotnet-dependency-config | ✅ |
| 6 | Validações e erros | 2.0, 3.0, 4.0, 6.0 | dotnet-code-quality | ✅ |
| 7 | Testes | 2.0–7.0 | dotnet-testing / react-testing | ✅ |
| 8 | Observabilidade | 3.0, 7.0 | dotnet-observability | ✅ |
| 9 | Documentação | 4.0, 7.0 | — | ✅ |
| 10 | Segurança | 1.0, 4.0, 5.0, 7.0 | production-readiness | ✅ |

## Análise de Paralelização

| Lane | Tarefas | Condição |
|---|---|---|
| A — backend core | 1.0 → 2.0 → 3.0 → 4.0 | Caminho crítico; compartilha contratos e DI. |
| B — frontend base | 5.0 | Pode iniciar após a definição estável dos DTOs de 2.0; concluir após 4.0 para validar chamadas reais. |
| C — wizard | 6.0 | Após 5.0; pode avançar com MSW enquanto 4.0 finaliza. |
| D — gate | 7.0 | Após 4.0 e 6.0. |

### Caminho crítico

`1.0 → 2.0 → 3.0 → 4.0 → 5.0 → 6.0 → 7.0`

### Diagrama de dependências

```text
1.0 ──> 2.0 ──> 3.0 ──> 4.0 ──> 7.0
                 │         │
                 └──> 5.0 ─┴──> 6.0 ──> 7.0
```
