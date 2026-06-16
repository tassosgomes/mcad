# Resumo de Tarefas de Implementação — Responsável amigável nas Captações

## Visão Geral

Esta funcionalidade resolve três problemas no domínio de **Identificação** reaproveitando a projeção local `usuarios_identidade` (hoje só escrita pelo consumer RabbitMQ, sem caminho de leitura):

- **F1** — Substituir o filtro "Responsável (ID)" (texto livre UUID) por uma combo de analistas por nome.
- **F2** — Resolver o nome real do responsável no cadastro (em vez de "Desconhecido").
- **F3** — Backfill idempotente das captações históricas com responsável "Desconhecido".

A decisão arquitetural central é a **unificação da conversão `sub → Guid`** em um helper de domínio puro (`AnalistaIdentificador`), pois o `Guid(byte[])` do .NET usa ordem de bytes mista (mixed-endian) e **não** equivale ao `md5()::uuid` do PostgreSQL. Combo, cadastro e backfill precisam reproduzir exatamente a mesma conversão para casar com o mesmo usuário.

Stack: .NET 8 Minimal API (`services/identificacao-api`, camadas numeradas 1-Services…5-Tests) + React 19/Vite (`frontend`).

## Fases de Implementação

### Fase 1 — Fundações (crítica, bloqueia tudo)
Cria o pilar de conversão de identificador (`AnalistaIdentificador`) e o caminho de leitura da projeção (`UsuarioIdentidade` + repositório + DI). Ambas são independentes entre si e podem ser feitas em paralelo.

### Fase 2 — Funcionalidades (F1, F2, F3 em paralelo)
As três features se ramificam a partir das fundações, cada uma tocando um conjunto distinto de arquivos. F1 tem um passo extra de frontend após o backend.

### Fase 3 — Qualidade integrada
Testes de integração (Testcontainers) que cruzam as três features end-to-end, incluindo o cenário de autorização 403 do backfill.

## Tarefas

- [x] 1.0 AnalistaIdentificador + refactor de UserContextExtensions
- [x] 2.0 Read model UsuarioIdentidade + repositório + DI
- [x] 3.0 F1 Backend — ListarAnalistasQuery + endpoint GET /analistas
- [x] 4.0 F1 Frontend — Combo de Responsável no filtro
- [x] 5.0 F2 — Resolução do nome do responsável no cadastro
- [x] 6.0 F3 — Backfill de responsáveis "Desconhecido"
- [ ] 7.0 Testes de Integração (Testcontainers) end-to-end

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| Lane Foundation A | 1.0 | Unificação da conversão `sub → Guid` (Domain + Services). Arquivos: `AnalistaIdentificador.cs`, `UserContextExtensions.cs`. |
| Lane Foundation B | 2.0 | Caminho de leitura da projeção `usuarios_identidade` (Domain + Infra + Services DI). Arquivos: `UsuarioIdentidade.cs`, `IUsuarioIdentidadeRepository.cs`, `UsuarioIdentidadeRepository.cs`, `UsuarioIdentidadeConfiguration.cs`, `IdentificacaoDbContext.cs`, `Program.cs`. |
| Lane F1 | 3.0 → 4.0 | Combo: backend (query/endpoint) e depois frontend (hook/api/Select). |
| Lane F2 | 5.0 | Resolução do nome no cadastro (command/handler/endpoint). |
| Lane F3 | 6.0 | Backfill (método de domínio + command/handler + endpoint admin). |
| Lane QA | 7.0 | Testes de integração que validam as três features em conjunto. |

> **1.0 e 2.0 não têm dependência entre si** (arquivos disjuntos; a entidade de read model não usa `AnalistaIdentificador`). Podem ser executadas simultaneamente por duas pessoas/agentes.

> **3.0, 5.0 e 6.0** desbloqueiam juntas após 1.0 + 2.0 e tocam arquivos distintos (queries/commands/endpoint diferentes), podendo correr em paralelo. A única ressalva é a entidade `Captacao` (tocada por 6.0 para adicionar um método e lida por 5.0/3.0 apenas em leitura) — risco baixo.

### Caminho Crítico

```
(1.0 ‖ 2.0)  →  3.0  →  4.0
            ↘
              5.0  ↘
                    →  7.0
              6.0  ↗
```

A duração mínima é determinada por: **Fundações** (max de 1.0/2.0) → **feature mais longa** (tipicamente 3.0→4.0, com passo de frontend) → **7.0**. Em paralelo, 5.0 e 6.0 são absorvidos dentro da janela de 3.0+4.0 sempre que houver gente disponível.

### Diagrama de Dependências

```
            ┌──────────────────┐         ┌──────────────────┐
            │ 1.0 AnalistaId.. │         │ 2.0 Read model   │
            │  +UserContext    │         │  +Repository+DI  │
            └────────┬─────────┘         └─────────┬────────┘
                     │      ↘ paralelo             ↙
                     ▼                             ▼
        ┌───────────────────────────────────────────────────┐
        │              (fundações concluídas)                │
        └───┬───────────────────┬──────────────────────┬────┘
            ▼                   ▼                      ▼
     ┌────────────┐      ┌─────────────┐        ┌─────────────┐
     │ 3.0 F1 BE  │      │ 5.0 F2 nome │        │ 6.0 F3 bfill│
     └─────┬──────┘      └─────────────┘        └─────────────┘
           ▼                   │                      │
     ┌────────────┐            │                      │
     │ 4.0 F1 FE  │            │                      │
     └────────────┘            ▼                      ▼
                       ┌─────────────────────────────────┐
                       │      7.0 Integração E2E         │
                       └─────────────────────────────────┘
```

### Verificações de Paralelização

- **Duplicação de arquitetura:** nenhuma — combo/cadastro/backfill convergem para o mesmo `AnalistaIdentificador` e `IUsuarioIdentidadeRepository`, evitando regras divergentes.
- **Componentes faltantes:** read model EF, repositório de leitura, query/endpoint de analistas, métodos de `UserContextExtensions`, método de domínio `ReatribuirNomeResponsavel`, command de backfill — todos cobertos pelas tarefas.
- **Pontos de integração:** `GET /api/v1/analistas` (novo), `POST /api/v1/captacoes` (contrato inalterado, resolução interna), `POST /api/v1/captacoes/manutencao/reprocessar-responsaveis` (novo, admin), `GET /api/v1/captacoes?analistaResponsavelId=` (reutilizado sem mudança).
- **Conformidade com padrões:** camadas numeradas (dotnet-architecture), CQRS nativo via `IDispatcher`, rotas `/api/v1/...` (restful-api), hook/api/Select tipados (react-architecture/code-quality), xUnit + Testcontainers (dotnet-testing).
