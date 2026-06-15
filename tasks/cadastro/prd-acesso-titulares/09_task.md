---
status: pending
parallelizable: true
blocked_by: ["3.0", "4.0"]
---

<task_context>
<domain>cadastro/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"12.0", "14.0"</unblocks>
</task_context>

# Tarefa 9.0: Solicitações de Alteração — Lado do Titular (RF-14, RF-15, RF-17, RF-20, RF-21)

## Visão Geral

Implementar a abertura e listagem de solicitações de alteração de dados sensíveis pelo titular. A solicitação nasce `SOLICITADA` e aplica a regra de integridade RF-20 (associação nunca removida). A aprovação/rejeição pelo Analista fica na tarefa 12.0.

## Requisitos

- RF-14 (abrir solicitação com campo, valor pretendido, justificativa), RF-15 (nasce `SOLICITADA`), RF-17 (titular vê status), RF-20 (associação não pode ser removida — destino obrigatório), RF-21 (aviso de janela de distribuição)
- Tech Spec — seção *SolicitacaoAlteracao* e *Endpoints de API*

## Subtarefas

- [ ] 9.1 Criar `2-Application/Cadastro.Application/Portal/Commands/AbrirSolicitacaoCommand.cs` (`record AbrirSolicitacaoCommand(Guid TitularId, string Campo, string ValorPretendido, string Justificativa) : ICommand<SolicitacaoResponse>`).
- [ ] 9.2 Criar `AbrirSolicitacaoCommandValidator.cs` — `Campo` enum válido, `ValorPretendido` obrigatório, `Justificativa` mín. 10 chars.
- [ ] 9.3 Criar `AbrirSolicitacaoCommandHandler.cs`:
  1. Obter `ValorAtual` do titular (ex: se `Campo == NOME`, ler `titular.Nome`; se `ASSOCIACAO`, ler sigla da associação vinculada).
  2. `SolicitacaoAlteracao.Criar(titularId, campo, valorAtual, valorPretendido, justificativa)` — o domínio valida RF-20 (se `Campo == ASSOCIACAO` e `ValorPretendido` vazio → `DomainException`). Nasce `SOLICITADA` (RF-15).
  3. `_repo.AddAsync` + `_repo.SaveChangesAsync`.
  4. Retornar `SolicitacaoResponse`.
- [ ] 9.4 Criar `2-Application/Cadastro.Application/Portal/Queries/ListarMinhasSolicitacoesQuery.cs` (`record ListarMinhasSolicitacoesQuery(Guid TitularId, string? Status, int Page, int Size) : IQuery<PaginationResponse<SolicitacaoResponse>>`).
- [ ] 9.5 Criar `ListarMinhasSolicitacoesQueryHandler.cs` — filtra por `titularId` do `ICurrentTitular` (RF-17).
- [ ] 9.6 Criar endpoints em `PortalEndpoints.cs`:
  - `POST /solicitacoes-alteracao` — `.RequireAuthorization("PortalTitular")`.
  - `GET /solicitacoes-alteracao` — `.RequireAuthorization("PortalTitular")`, suporta `?status=&page=&size=`.
- [ ] 9.7 DTO: `SolicitacaoResponse` (id, campo, valorAtual, valorPretendido, justificativa, status, decididaEm?, justificativaRejeicao?). Em `Portal/Responses/`. Incluir campo derivado `exigeAvisoJanela` (bool) quando `Campo == ASSOCIACAO` — para o frontend exibir o aviso RF-21.
- [ ] 9.8 Testes unitários (`5-Tests/Cadastro.UnitTests/Portal/`):
  - `AbrirSolicitacaoCommandHandlerTests.cs` — campo `ASSOCIACAO` sem destino → `DomainException` (RF-20); demais campos (`NOME`/`CAE_IPI`/`CATEGORIA`) criam `SOLICITADA`; valor atual capturado corretamente.
  - `ListarMinhasSolicitacoesQueryHandlerTests.cs` — filtra por `titularId`.

## Sequenciamento

- Bloqueado por: 3.0 (tabela `solicitacoes_alteracao`), 4.0 (`ICurrentTitular`)
- Desbloqueia: 12.0 (Analista aprova/rejeita), 14.0 (frontend)
- Paralelizável: Sim (independente de 6.0, 7.0, 8.0)

## Detalhes de Implementação

**Captura do `ValorAtual`:** o handler lê o estado atual do titular para registrar na solicitação (para auditoria e contexto do Analista). Exemplo:

```csharp
var valorAtual = campo switch
{
    CampoSolicitacao.NOME => titular.Nome,
    CampoSolicitacao.CAE_IPI => titular.CaeIpi?.Formatado ?? "",
    CampoSolicitacao.ASSOCIACAO => titular.AssociacaoId.ToString(),
    CampoSolicitacao.CATEGORIA => titular.Categoria.ToString(),
    _ => throw new DomainException("Campo inválido")
};
```

**RF-20 (proibição de remoção de associação):** a validação está no domínio (`SolicitacaoAlteracao.Criar`), mas o validator da aplicação também deve rejeitar `ValorPretendido` vazio quando `Campo == ASSOCIACAO` (defesa em profundidade — falhar antes de chegar ao domínio com mensagem mais útil).

**RF-21 (aviso de janela de distribuição):** o aviso é puramente de UI (frontend, tarefa 14.0). O backend sinaliza via o campo `exigeAvisoJanela` no response/query de suporte, para que o frontend saiba quando exibi-lo.

## Critérios de Sucesso

- Titular abre solicitação que nasce `SOLICITADA` (RF-14, RF-15).
- Solicitação de alteração de associação sem destino é rejeitada (RF-20) com mensagem clara.
- Titular lista o status das suas solicitações (RF-17), isoladas por `titularId`.
- `dotnet test 5-Tests/Cadastro.UnitTests` passa.
