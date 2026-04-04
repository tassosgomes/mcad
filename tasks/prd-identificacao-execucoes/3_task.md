---
status: pending
parallelizable: false
blocked_by: [1.0]
---

<task_context>
<domain>identificacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Backend — Application (Commands: ResolverPendente, ResolverLote) + Testes

## Relacionada aos Requisitos

- RF-03 — Resolução manual (individual)
- RF-04 — Resolução em lote (com rejeição parcial)

## Visão Geral

Criar command handlers para resolução individual e em lote de execuções pendentes, com validação de obra LIBERADA no Cadastro, verificação de captação ABERTA, e resultado parcial (resolvidas + rejeitadas).

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Commands/ResolverPendenteCommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Commands/ResolverPendenteCommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Commands/ResolverPendentesEmLoteCommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Commands/ResolverPendentesEmLoteCommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Responses/ResolverLoteResponse.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/ResolverPendenteCommandHandlerTests.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/ResolverPendentesEmLoteCommandHandlerTests.cs`
- **Referência:**
  - `services/identificacao-api/4-Infra/Identificacao.Infra/ExternalServices/CadastroHttpClient.cs` (GetObraById, GetFonogramaById)
  - `tasks/prd-identificacao-execucoes/techspec.md` (lógica dos handlers)

## Subtarefas

- [ ] 3.1 Criar `ResolverPendenteCommand` + validator + handler — valida PENDENTE, captação ABERTA, obra LIBERADA, chama Resolver()
- [ ] 3.2 Criar `ResolverPendentesEmLoteCommand` + validator + handler — valida obra LIBERADA uma vez, loop com rejeição parcial
- [ ] 3.3 Criar `ResolverLoteResponse` (resolvidas, rejeitadas, detalhesRejeitadas)
- [ ] 3.4 Testes `ResolverPendenteCommandHandlerTests` — 6 cenários
- [ ] 3.5 Testes `ResolverPendentesEmLoteCommandHandlerTests` — 4 cenários

## Sequenciamento

- Bloqueado por: 1.0 (Resolver() no domínio + queries no repo)
- Desbloqueia: 4.0
- Paralelizável: Pode rodar em paralelo com 2.0

## Detalhes de Implementação

**ResolverPendenteCommandHandler:** conforme TechSpec — busca execução com include Captacao, valida PENDENTE, valida captação ABERTA, consulta Cadastro (GetObraById + GetFonogramaById), valida LIBERADO, chama `execucao.Resolver()`, save.

**ResolverPendentesEmLoteCommandHandler:** conforme TechSpec — valida obra LIBERADA uma vez (rejeita lote inteiro se não LIBERADA), loop por IDs com try/catch por execução, resultado parcial.

**Testes ResolverPendente (6 cenários):**
1. `Handle_ObraLiberada_ResolveComSucesso`
2. `Handle_ObraNaoLiberada_LancaDomainException`
3. `Handle_ExecucaoJaIdentificada_LancaConflictException`
4. `Handle_CaptacaoFechada_LancaDomainException`
5. `Handle_FonogramaLiberado_ResolveComSucesso`
6. `Handle_FonogramaNaoLiberado_LancaDomainException`

**Testes ResolverLote (4 cenários):**
7. `Handle_3De3ComSucesso_TodasResolvidas`
8. `Handle_2De3CaptacaoFechada_RejeicaoParcial`
9. `Handle_ObraNaoLiberada_RejeitaLoteInteiro`
10. `Handle_ExecucaoNaoEncontrada_RejeitadaNaoBloqueiaRestante`

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/identificacao-api && dotnet build`
- [ ] Testes: `cd services/identificacao-api && dotnet test --filter "FullyQualifiedName~ResolverPendente"`
- [ ] 10 cenários cobertos
- [ ] Resolução em lote retorna resultado parcial (resolvidas + rejeitadas com motivo)
