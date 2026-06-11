# Resumo de Tarefas de Implementacao de Gestao de Ciclo de Vida de Permissoes

## Visao Geral

Esta funcionalidade amplia o modulo de Autorizacao do MCAD para governar o ciclo de vida administrativo de permissoes. O PRD pede cadastro, deprecacao, reativacao, remocao logica e visibilidade dos papeis vinculados. A Tech Spec confirmou, porem, que a OpenAPI atual do `ecad-authz` permite entregar imediatamente apenas listagem, detalhe, deprecacao e lookup de vinculos. Por isso o plano foi dividido em duas fases:

- **Fase 1:** entrega imediata no MCAD com o contrato atual do `ecad-authz`.
- **Fase 2:** ativacao completa dos fluxos de criar, reativar e remover quando o upstream disponibilizar os novos endpoints.

## Fases de Implementacao

### Fase 1 - Entrega Imediata com Contrato Atual

Consolidar a estrategia de integracao, implementar no BFF as rotas governadas possiveis hoje, alinhar frontend ao contrato oficial `ACTIVE | DEPRECATED | DISABLED`, enriquecer listagem e detalhe de permissao, e fechar testes/docs da entrega parcial.

### Fase 2 - Ativacao Completa Pos-Evolucao do Upstream

Assim que o `ecad-authz` publicar endpoints administrativos de create/reactivate/remove, ativar esses fluxos no MCAD sem mudar a arquitetura base da Fase 1.

## Tarefas

- [x] 1.0 Formalizar contrato externo do Authz e matriz de capabilities do MCAD
- [x] 2.0 Implementar no BFF a consulta governada de papeis vinculados e elegibilidade de remocao
- [ ] 3.0 Implementar no BFF a deprecacao auditada de permissao
- [ ] 4.0 Alinhar tipos, clientes e camada compartilhada do frontend ao contrato oficial do Authz
- [ ] 5.0 Atualizar a listagem de permissoes para estados, filtros e CTAs condicionais
- [ ] 6.0 Atualizar o detalhe de permissao com vinculos, elegibilidade e fluxo governado de deprecacao
- [ ] 7.0 Ativar os fluxos de criar, reativar e remover apos disponibilizacao dos endpoints no `ecad-authz`
- [ ] 8.0 Consolidar testes, documentacao e rollout da feature em duas fases

## Analise de Paralelizacao

### Lanes de Execucao Paralela

| Lane | Tarefas | Descricao |
|------|---------|-----------|
| Lane A | 1.0 | Fecha premissas de contrato, status oficial e capability matrix. Bloqueia o restante. |
| Lane B | 2.0, 3.0 | Trabalho de BFF sobre rotas governadas ja suportadas pelo upstream. Pode rodar em paralelo apos 1.0. |
| Lane C | 4.0 | Ajustes compartilhados de frontend e clientes API. Pode rodar em paralelo com Lane B apos 1.0. |
| Lane D | 5.0 | Evolucao da listagem de permissoes. Depende de 4.0. |
| Lane E | 6.0 | Evolucao do detalhe de permissao. Depende de 2.0, 3.0 e 4.0. |
| Lane F | 7.0 | Lane externa, dependente da evolucao do `ecad-authz`. Reaproveita a base criada nas outras tasks. |
| Lane G | 8.0 | Fechamento, testes, docs e rollout. Depende da entrega imediata e incorpora a Fase 2 quando 7.0 concluir. |

### Caminho Critico

**Entrega imediata:** `1.0 -> 2.0 -> 6.0 -> 8.0`

**Entrega completa do PRD:** `1.0 -> 7.0 -> 8.0`

### Diagrama de Dependencias

```text
1.0
├── 2.0 ──┐
├── 3.0 ──┤
├── 4.0 ──┬── 5.0 ──┐
│         └── 6.0 ──┼── 8.0
└── 7.0 ────────────┘
```
