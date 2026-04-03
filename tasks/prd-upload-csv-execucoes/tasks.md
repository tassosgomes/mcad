# Resumo de Tarefas — F03: Upload de Execuções via CSV

## Visão Geral

Implementação de upload de arquivos CSV com processamento assíncrono, armazenamento MinIO, parsing/validação/agrupamento de execuções, relatório de erros por linha/coluna e acompanhamento de status via polling.

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `csharp-dotnet-architecture` | Clean Architecture, BackgroundService, CQRS |
| `dotnet-testing` | xUnit + AwesomeAssertions + Moq, padrão AAA |
| `react-architecture` | Feature modules, hooks, polling pattern |
| `common-restful-api` | 202 Accepted, multipart/form-data, sub-recurso |

## Fases de Implementação

### Fase 1 — Infraestrutura MinIO (Task 1)
Docker Compose + MinioService. Pré-requisito para todo o resto.

### Fase 2 — Backend (Tasks 2-6)
Domain, Infra, CsvParser, Application, API e Worker.

### Fase 3 — Frontend (Tasks 7-10)
Mockups, types/hooks, componentes e integração.

## Tarefas

- [x] 1.0 Infraestrutura — MinIO no Docker Compose + MinioService
- [x] 2.0 Backend — Domain Layer (Upload, ErroUpload, Interfaces)
- [x] 3.0 Backend — Infrastructure (DbContext, Migration, Repositories)
- [x] 4.0 Backend — CsvParser (parse, validação, agrupamento, duplicatas)
- [x] 5.0 Backend — Application Layer (Commands, Queries, Handlers)
- [x] 6.0 Backend — API (Endpoints, CsvProcessorWorker, Program.cs)
- [x] 7.0 Frontend — Mockups no Stitch
- [x] 8.0 Frontend — Types, API Client e Hooks
- [ ] 9.0 Frontend — Componentes
- [ ] 10.0 Frontend — Integração na CaptacaoDetailPage

## Rastreabilidade RF → Tasks

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 — Upload CSV para MinIO | 1.0, 5.0, 6.0, 8.0, 9.0 | ✅ Coberto |
| RF-02 — Processamento assíncrono | 4.0, 6.0 | ✅ Coberto |
| RF-03 — Validação linha a linha | 4.0 | ✅ Coberto |
| RF-04 — Agrupamento linhas idênticas | 4.0 | ✅ Coberto |
| RF-05 — Detecção ISRC duplicado divergente | 4.0 | ✅ Coberto |
| RF-06 — Identificação automática via Cadastro | 6.0 | ✅ Coberto |
| RF-07 — Tela de Uploads com status | 8.0, 9.0, 10.0 | ✅ Coberto |
| RF-08 — Relatório de erros | 5.0, 8.0, 9.0 | ✅ Coberto |
| RF-09 — Campos condicionais por rubrica | 4.0 | ✅ Coberto |

## Validação de Cobertura

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuração | 1.0 (MinIO), 6.0 (.env) | ✅ |
| 2 | Modelos de Dados | 2.0, 3.0 | ✅ |
| 3 | Lógica de Negócio | 2.0, 4.0 | ✅ |
| 4 | Endpoints / Interfaces | 6.0 | ✅ |
| 5 | Integrações Externas | 1.0 (MinIO), 6.0 (Cadastro reutilizado F02) | ✅ |
| 6 | Validações e Erros | 4.0 (CsvParser) | ✅ |
| 7 | Testes | Subtarefas em 2.0, 4.0, 5.0 | ✅ |
| 8 | Observabilidade | 6.0 (logging no Worker) | ✅ |
| 9 | Documentação | 6.0 (.env.example) | ✅ |
| 10 | Segurança | 6.0 (auth, propriedade do analista) | ✅ |

## Análise de Paralelização

### Lanes de Execução

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| Lane A (Infra) | 1.0 → 3.0 → 5.0 → 6.0 | MinIO + DB + App + API |
| Lane B (Domain) | 2.0 | Paralelo com 1.0 |
| Lane C (CsvParser) | 4.0 | Lógica pura, paralelo com 1-3 |
| Lane D (Mockups) | 7.0 | Independente |
| Lane E (Frontend) | 8.0 → 9.0 → 10.0 | Após mockups |

### Diagrama de Dependências

```
1.0 (MinIO) ──────────┐
2.0 (Domain) ─────────┼──→ 3.0 (Infra) ──→ 5.0 (App) ──→ 6.0 (API+Worker)
4.0 (CsvParser) ──────┘                                       │
                                                                │
7.0 (Stitch) ─────────────────────────────────────────→ 9.0 → 10.0
8.0 (types/hooks) ────────────────────────────────────→ 9.0
```

**Tasks paralelas desde o início:** 1.0, 2.0, 4.0, 7.0, 8.0
