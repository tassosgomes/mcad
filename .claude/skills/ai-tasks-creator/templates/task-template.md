---
status: pending # Opcoes: pending, in-progress, completed, excluded
parallelizable: false # Se pode executar em paralelo
blocked_by: [] # IDs de tarefas que devem ser completadas primeiro
---

<task_context>
<domain>engine/infra/[subdominio]</domain>
<type>implementation|integration|testing|documentation</type>
<scope>core_feature|middleware|configuration|performance</scope>
<complexity>low|medium|high</complexity>
<dependencies>external_apis|database|temporal|http_server</dependencies>
<unblocks>"[IDs de tarefas desbloqueadas]"</unblocks>
</task_context>

# Tarefa X.0: [Titulo da Tarefa Principal]

## Visao Geral

[Breve descricao da tarefa, contexto e motivacao]

## Requisitos

- [Requisito 1]
- [Requisito 2]

## Subtarefas

- [ ] X.1 [Descricao da subtarefa]
- [ ] X.2 [Descricao da subtarefa]
- [ ] X.3 [Testes unitarios]

## Sequenciamento

- Bloqueado por: [IDs ou "Nenhum"]
- Desbloqueia: [IDs]
- Paralelizavel: [Sim/Nao] ([justificativa])

## Detalhes de Implementacao

[Secoes relevantes da spec tecnica, trechos de codigo, decisoes de design]

## Criterios de Sucesso

- [Resultado mensuravel 1]
- [Resultado mensuravel 2]
- [Requisito de qualidade]
