# Resumo de Tarefas — F06: Estorno de Pagamento (Backend + Frontend)

## Visao Geral

Implementacao do estorno de pagamento: 1 endpoint backend, extensao de entidade Pagamento (3 campos + assinatura atualizada), recalculo de verba via interface VerbaService (F05), evento Outbox e frontend com modal de confirmacao. Reutiliza infraestrutura CQRS, Repository Pattern e Outbox do F01-F04.

## Skills de Stack Consultadas

| Skill | Influencia |
|-------|------------|
| `java-architecture` | CQRS Command/Handler, domain method, Outbox Pattern |
| `java-testing` | JUnit 5 + AssertJ + Mockito (AAA), Testcontainers |
| `java-code-quality` | Guard clauses, records, Bean Validation |
| `java-observability` | Logging SLF4J |
| `react-architecture` | Feature modules, hooks, modal pattern |
| `react-code-quality` | TypeScript strict, CSS Modules |

## Tarefas

- [x] 1.0 Migration V9: colunas de estorno no pagamento
- [x] 2.0 Domain: atualizar Pagamento.estornar() + VerbaService interface + exception + testes
- [x] 3.0 Application: EstornarPagamentoCommand + Handler + DTO + testes
- [x] 4.0 API: endpoint POST /estornar + GlobalExceptionHandler + testes integracao
- [x] 5.0 Frontend: types + API + hook + modal + extensao detail page

## Rastreabilidade US -> Tasks

| User Story | Tasks | Cobertura |
|------------|-------|-----------|
| HU-01 Estornar pagamento | 1.0, 2.0, 3.0, 4.0, 5.0 | Direta |
| HU-02 Consultar pagamento estornado | 2.0, 4.0, 5.0 | Direta |

## Validacao de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 Estorno apenas CONFIRMADO | 2.0 | ✅ |
| RF-02 Justificativa 10-500 chars | 2.0, 3.0 | ✅ |
| RF-03 Bloqueio verba EM_DISTRIBUICAO/DISTRIBUIDA | 2.0, 3.0 | ✅ |
| RF-04 Recalculo verba apos estorno | 3.0 | ✅ |
| RF-05 Evento Outbox arrecadacao.pagamento.estornado | 3.0 | ✅ |
| RF-06 Registrar autor e timestamp | 2.0 | ✅ |
| RF-07 Liberar unicidade licenca+periodo | 2.0 (automatico via partial unique) | ✅ |
| RF-08 Dados de estorno na consulta GET | 3.0, 4.0 | ✅ |
| RF-09 Evento verba.disponivel mesmo com zero | 3.0 | ✅ |

### Categorias Obrigatorias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuracao | 1.0 (migration V9) | ✅ |
| 2 | Modelos de Dados | 1.0 (DDL), 2.0 (entity) | ✅ |
| 3 | Logica de Negocio | 2.0 (domain), 3.0 (handler) | ✅ |
| 4 | Endpoints / Interfaces | 4.0 (POST /estornar) | ✅ |
| 5 | Integracoes Externas | N/A | ✅ |
| 6 | Validacoes e Erros | 2.0 (guards), 4.0 (GlobalExceptionHandler) | ✅ |
| 7 | Testes | 2.0, 3.0 (unitarios), 4.0 (integracao) | ✅ |
| 8 | Observabilidade | 4.0 (logging SLF4J) | ✅ |
| 9 | Documentacao | N/A — API docs via OpenAPI existente | ✅ |
| 10 | Seguranca | 4.0 (@PreAuthorize), 5.0 (role check frontend) | ✅ |

## Analise de Paralelizacao

### Sequenciamento

```
1.0 Migration → 2.0 Domain → 3.0 Application → 4.0 API+Tests → 5.0 Frontend
```

Todas sequenciais — feature pequena, sem oportunidade de paralelizacao.

### Dependencias Externas

- F04 implementado (Pagamento entity, PagamentoController, PagamentoRepository)
- F05 parcialmente necessario (VerbaService interface definida aqui; mock nos testes)
