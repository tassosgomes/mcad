# Implementação F06: Gestão de Rubricas — Resumo de Tarefas

## Tarefas

- [ ] 1.0 Backend Arrecadação — Domain e Infra (Migration, Entity, Repository, SiglaSuggester)
- [ ] 2.0 Backend Arrecadação — Application (Commands, Handlers, DTOs)
- [ ] 3.0 Backend Arrecadação — API (Controller, Permissões, Validações em Licença/Pagamento)
- [ ] 4.0 Backend Distribuição — Sincronização de campo `ativo`
- [ ] 5.0 Frontend — CRUD de Rubricas (API, Hooks, Components, Pages)
- [ ] 6.0 Testes — Unitários e Integração
- [ ] 7.0 Validação Cross-Domain e Finalização

## Sequenciamento

```
1.0 (Domain/Infra Arrecadacao)
    │
    ▼
2.0 (Application Arrecadacao)
    │
    ├──┬──┐
    ▼  │  ▼
3.0  │  4.0 (Distribuicao)
(API) │  (Sincronizacao)
    │  │
    └──┼──┘
       ▼
    5.0 (Frontend)
       │
       ▼
    6.0 (Testes) ──► 7.0 (Finalizacao)
```

### Caminho Crítico

`1.0 → 2.0 → 3.0 → 5.0 → 6.0 → 7.0`

### Paralelização

- **4.0** pode ser executado em paralelo com **3.0** desde que o contrato de evento (`RubricaEventPayload` com `ativo`) esteja definido em 2.0

---

## Arquivos de Tarefas Individuais

Cada tarefa tem seu próprio arquivo detalhado:

- `tasks/arrecadacao/prd-gestao-rubricas/1_task.md` — Domain e Infra
- `tasks/arrecadacao/prd-gestao-rubricas/2_task.md` — Application
- `tasks/arrecadacao/prd-gestao-rubricas/3_task.md` — API e Permissões
- `tasks/arrecadacao/prd-gestao-rubricas/4_task.md` — Distribuição
- `tasks/arrecadacao/prd-gestao-rubricas/5_task.md` — Frontend
- `tasks/arrecadacao/prd-gestao-rubricas/6_task.md` — Testes
- `tasks/arrecadacao/prd-gestao-rubricas/7_task.md` — Finalização
