---
status: pending
parallelizable: true
blocked_by: ["1.0", "2.0", "3.0"]
---

<task_context>
<domain>arrecadacao/uda-pagamentos</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"8.0, 9.0"</unblocks>
</task_context>

# Tarefa 6.0: UDA e Pagamento/Estorno - snapshots de criacao/estorno e DTOs enriquecidos

## Relacionada as User Stories

- [HU-01] Analista identifica quem ajustou UDA ou estornou pagamento
- [HU-02] Consultor valida registros historicos financeiros com clareza
- [HU-03] Auditoria preserva identidade imutavel

## Visao Geral

Aplicar o modelo de ator em UDA e Pagamento/Estorno. UDA deve congelar quem criou o valor; Pagamento deve congelar quem executou estorno. As leituras de UDA vigente/historico e pagamentos list/detail devem adicionar objetos `criadoPorAtor` e `estornadoPorAtor`, mantendo campos legados.

## Requisitos

- Atualizar `AjustarUdaCommandHandler` e entidade `UdaValor` para persistir `criado_por_subject` e `criado_por_rotulo`.
- Atualizar `EstornarPagamentoCommandHandler` e entidade `Pagamento` para persistir `estornado_por_subject` e `estornado_por_rotulo`.
- Avaliar `RegistrarPagamentoCommand`: se `criadoPor` nao e exposto no contrato, nao adicionar fora do escopo.
- Atualizar `UdaResponse` com `ActorDisplayResponse criadoPorAtor`.
- Atualizar `PagamentoResponse` com `ActorDisplayResponse estornadoPorAtor`.
- Atualizar query handlers de UDA vigente/historico e pagamento list/detail.
- Pagamento confirmado sem estorno deve retornar `estornadoPor`/`estornadoPorAtor` nulos ou compativeis com o contrato atual.
- Historicos antigos devem preservar `criadoPor`/`estornadoPor` legados.

## Subtarefas

- [ ] 6.1 Atualizar `UdaValor.criar(...)` para aceitar snapshot e preencher campos congelados.
- [ ] 6.2 Atualizar `AjustarUdaCommand` e `AjustarUdaCommandHandler`.
- [ ] 6.3 Atualizar `Pagamento.estornar(...)` para aceitar snapshot e preencher campos de estorno.
- [ ] 6.4 Atualizar `EstornarPagamentoCommand` e `EstornarPagamentoCommandHandler`.
- [ ] 6.5 Atualizar `UdaResponse`, `ConsultarUdaVigenteQueryHandler` e `ListarHistoricoUdaQueryHandler`.
- [ ] 6.6 Atualizar `PagamentoResponse`, `ListarPagamentosQueryHandler` e `BuscarPagamentoPorIdQueryHandler`.
- [ ] 6.7 Ajustar testes unitarios de UDA e estorno para verificar subject, rotulo e campos legados.
- [ ] 6.8 Testar pagamento confirmado sem estorno e registro antigo sem subject.

## Sequenciamento

- Bloqueado por: 1.0, 2.0, 3.0
- Desbloqueia: 8.0, 9.0
- Paralelizavel: Sim (trilha isolada de UDA/Pagamento apos a fundacao)

## Rastreabilidade

- Esta tarefa cobre `GET /api/v1/uda/vigente`, `GET /api/v1/uda/historico`, `GET /api/v1/pagamentos` e `GET /api/v1/pagamentos/{id}`.
- Evidencia esperada: UDA e pagamentos retornam campos legados e objetos de ator quando aplicavel.

## Detalhes de Implementacao

Contratos esperados:

- `UdaResponse`: manter `criadoPor`; adicionar `criadoPorAtor`.
- `PagamentoResponse`: manter `estornadoPor`; adicionar `estornadoPorAtor`.

O rotulo congelado deve ser usado como valor legado em novos registros:

- `UdaValor.criadoPor = actorSnapshot.label()`
- `Pagamento.estornadoPor = actorSnapshot.label()`

Nao alterar o fluxo funcional de registro de pagamento, calculo ou estorno alem dos campos de ator.

## Criterios de Sucesso

- Ajuste de UDA grava subject e rotulo congelado sem quebrar seeds antigos.
- Estorno de pagamento grava subject e rotulo congelado.
- Endpoints de UDA e pagamento retornam objetos de ator compativeis.
- Testes cobrem fallback de legado e ausencia de ator em pagamento nao estornado.
