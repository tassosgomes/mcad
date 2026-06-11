---
status: pending
parallelizable: false
blocked_by: ["5.0", "6.0"]
---

<task_context>
<domain>engine/rollout/authz-permissions</domain>
<type>documentation</type>
<scope>middleware</scope>
<complexity>medium</complexity>
<dependencies>http_server,external_apis</dependencies>
<unblocks>"Nenhum"</unblocks>
</task_context>

# Tarefa 8.0: Consolidar testes, documentacao e rollout da feature em duas fases

## Visao Geral

Fechar a entrega do lado do MCAD com testes, documentacao operacional e plano de rollout dividido entre o que entra imediatamente com o contrato atual e o que fica pendente da evolucao do `ecad-authz`. Esta task tambem prepara o terreno para absorver a task 7.0 quando o upstream estiver pronto.

## Requisitos

- Consolidar a cobertura automatizada da Fase 1.
- Atualizar a documentacao da feature e, se necessario, notas de operacao.
- Registrar claramente:
  - o que esta pronto agora;
  - o que depende do upstream;
  - como habilitar a Fase 2 depois.
- Preparar checklist de validacao manual.

## Subtarefas

- [ ] 8.1 Executar e consolidar testes de BFF e frontend relacionados a permissions lifecycle
- [ ] 8.2 Atualizar `techspec.md` e/ou documentos auxiliares da feature com o estado da entrega
- [ ] 8.3 Revisar `authz-api-solicitacao.md` para garantir aderencia ao que ficou implementado no MCAD
- [ ] 8.4 Produzir checklist manual da Fase 1: listagem, detalhe, deprecacao e vinculacao
- [ ] 8.5 Documentar o plano de ativacao da Fase 2 apos entrega do upstream
- [ ] 8.6 Se 7.0 estiver concluida, incorporar validacao final do fluxo completo na documentacao

## Sequenciamento

- Bloqueado por: 5.0, 6.0
- Desbloqueia: Nenhum
- Paralelizavel: Nao (fecha a entrega e consome os resultados da implementacao)

## Detalhes de Implementacao

- Esta task fecha a **Fase 1** independentemente da disponibilidade da Fase 2.
- Quando 7.0 concluir, a task deve ser revisitada para consolidar o rollout completo do PRD.
- Referencias principais:
  - `tasks/prd-gestao-ciclo-vida-permissoes/techspec.md`
  - `tasks/prd-gestao-ciclo-vida-permissoes/authz-api-solicitacao.md`

## Criterios de Sucesso

- Existe um pacote claro de evidencia da Fase 1
- A documentacao deixa explicita a fronteira entre contrato atual e evolucao futura
- O time sabe exatamente como validar a entrega agora e como concluir a Fase 2 depois
- O caminho para absorver a entrega do `ecad-authz` esta documentado e sem ambiguidades
