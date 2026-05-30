---
status: pending
parallelizable: true
blocked_by: ["4.0", "5.0", "6.0", "7.0"]
---

<task_context>
<domain>frontend/arrecadacao/screens</domain>
<type>integration</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 8.0: Frontend - aplicar `ActorDisplay` nas telas de Arrecadacao afetadas

## Relacionada as User Stories

- [HU-01] Analista identifica rapidamente o responsavel por uma acao
- [HU-02] Consultor valida historicos com clareza

## Visao Geral

Substituir renderizacoes diretas de `autor`, `criadoPor` e `estornadoPor` por `ActorDisplay` nas telas da Arrecadacao. A UI deve manter informacoes existentes de data, transicao de status e justificativa, apenas melhorando a exibicao do ator.

## Requisitos

- Atualizar timeline de historico de status de Licencas.
- Atualizar timeline de historico de status de Usuarios de Musica.
- Atualizar UDA vigente e historico de UDA.
- Atualizar listagem/detalhe de Pagamento quando exibirem estorno/autor.
- Preservar fallback para payload antigo sem objeto de ator.
- Exibir status suspenso/removido junto ao autor quando recebido.
- Manter responsividade em desktop e mobile.
- Nao adicionar etapas novas aos fluxos operacionais.

## Subtarefas

- [ ] 8.1 Aplicar `ActorDisplay` em `HistoricoStatusTimeline` de Licencas.
- [ ] 8.2 Aplicar `ActorDisplay` em `HistoricoStatusUsuarioMusicaTimeline`.
- [ ] 8.3 Aplicar `ActorDisplay` em componentes/pagina de UDA vigente e historico.
- [ ] 8.4 Aplicar `ActorDisplay` em listagem e detalhe de Pagamentos quando houver `estornadoPor`.
- [ ] 8.5 Ajustar testes de timeline/tabela/pagina para payload com ator completo e payload legado.
- [ ] 8.6 Verificar layout mobile para linhas longas como e-mail ou subject tecnico.
- [ ] 8.7 Garantir que data, transicao de status e justificativa permanecem visiveis.

## Sequenciamento

- Bloqueado por: 4.0, 5.0, 6.0, 7.0
- Desbloqueia: 9.0
- Paralelizavel: Sim (pode ser dividido por tela apos o componente compartilhado)

## Rastreabilidade

- Esta tarefa cobre a exibicao nas telas citadas pelo PRD: Licencas, Usuarios de Musica, UDA e Pagamentos/Estornos.
- Evidencia esperada: telas renderizam label humano e status sem quebrar payloads antigos.

## Detalhes de Implementacao

Pontos de partida identificados:

- `frontend/src/features/arrecadacao/licencas/components/HistoricoStatusTimeline.tsx`
- `frontend/src/features/arrecadacao/usuarios-musica/components/HistoricoStatusUsuarioMusicaTimeline.tsx`
- `frontend/src/features/arrecadacao/uda/pages/UdaPage.tsx` e componentes relacionados
- `frontend/src/features/arrecadacao/pagamentos/pages/PagamentoDetailPage.tsx` e componentes/listagens de pagamentos

O componente deve receber o objeto novo quando existir e usar a string antiga como fallback:

```tsx
<ActorDisplay actor={historico.ator} fallbackLabel={historico.autor} />
<ActorDisplay actor={uda.criadoPorAtor} fallbackLabel={uda.criadoPor} />
<ActorDisplay actor={pagamento.estornadoPorAtor} fallbackLabel={pagamento.estornadoPor} />
```

## Criterios de Sucesso

- Todas as superficies afetadas usam `ActorDisplay`.
- Payload antigo sem `ator` continua renderizando o campo legado.
- Status `SUSPENSO` e `REMOVIDO` aparecem junto ao autor.
- Testes frontend cobrem cenarios novo e legado.
