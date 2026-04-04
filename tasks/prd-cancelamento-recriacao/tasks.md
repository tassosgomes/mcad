# Resumo de Tarefas — F06: Cancelamento e Recriação

## Visão Geral

Implementação do cancelamento de Rols fechados com justificativa, 3 opções de recriação, bloqueio pós-distribuição via consumer de evento, e publicação de `identificacao.rol.cancelado`.

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `csharp-dotnet-architecture` | CQRS, BackgroundService, consumer RabbitMQ |
| `dotnet-testing` | xUnit + AwesomeAssertions + Moq |
| `react-architecture` | Modais, radio buttons, navegação condicional |

## Tarefas

- [ ] 1.0 Backend — Domain (Captacao: Cancelar, MarcarDistribuicao) + Migration
- [ ] 2.0 Backend — Infra (DistribuicaoEventConsumer)
- [ ] 3.0 Backend — Application (PodeCancelar, CancelarRol) + Testes
- [ ] 4.0 Backend — API (Endpoints, Program.cs)
- [ ] 5.0 Frontend — Mockups no Stitch
- [ ] 6.0 Frontend — Types, API Client e Hooks
- [ ] 7.0 Frontend — Componentes + Integração CaptacaoDetailPage

## Rastreabilidade RF → Tasks

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 — Cancelar Rol fechado | 1.0, 3.0, 4.0, 7.0 | ✅ Coberto |
| RF-02 — Publicar evento cancelado | 3.0, 4.0 | ✅ Coberto |
| RF-03 — Opções de recriação | 3.0, 4.0, 7.0 | ✅ Coberto |
| RF-04 — Consumir evento distribuição | 1.0, 2.0, 4.0 | ✅ Coberto |
| RF-05 — Feedback visual | 5.0, 6.0, 7.0 | ✅ Coberto |

## Validação de Cobertura

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuração | 4.0 (Program.cs consumer) | ✅ |
| 2 | Modelos de Dados | 1.0 (novos campos + migration) | ✅ |
| 3 | Lógica de Negócio | 1.0, 3.0 | ✅ |
| 4 | Endpoints / Interfaces | 4.0 | ✅ |
| 5 | Integrações Externas | 2.0 (consumer RabbitMQ), 3.0 (Cadastro para recálculo) | ✅ |
| 6 | Validações e Erros | 3.0 (STATUS_INVALIDO, DISTRIBUICAO_PROCESSADA) | ✅ |
| 7 | Testes | Subtarefas em 1.0, 3.0 | ✅ |
| 8 | Observabilidade | 2.0 (logging no consumer) | ✅ |
| 9 | Documentação | N/A — vars RabbitMQ já em F05 | ✅ |
| 10 | Segurança | 4.0 (auth, propriedade RN-08) | ✅ |

## Análise de Paralelização

### Diagrama

```
1.0 (Domain+Migration) → 2.0 (Consumer) → 3.0 (App) → 4.0 (API)
                                                             │
5.0 (Stitch) ───────────────────────────────────────→ 7.0 ──┘
6.0 (types/hooks) ─────────────────────────────────→ 7.0
```

**Paralelas desde o início:** 1.0, 5.0, 6.0
