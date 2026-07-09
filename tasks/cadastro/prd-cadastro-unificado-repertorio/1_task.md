---
status: pending
parallelizable: false
blocked_by: []
---

<task_context>
<domain>cadastro/repertorios</domain>
<type>configuration</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database, authorization</dependencies>
<unblocks>"2.0, 3.0, 4.0"</unblocks>
</task_context>

# Tarefa 1.0: Preparar autorização e unidade de trabalho transacional do Cadastro

## Relacionada às User Stories

- [HU-01] Cadastrar repertório completo (suporte)
- [HU-04] Consultar o resultado (suporte de autorização)

## Visão Geral

Criar o limite transacional específico do Cadastro e disponibilizar a permissão exclusiva da jornada. Não criar migration, agregado, tabela ou `IUnitOfWork` genérico.

## Requisitos

- RF-20 a RF-23: transação local, rollback, permissão específica e suporte à auditoria.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/ICadastroUnitOfWork.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroUnitOfWork.cs`
- **Modificar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` (registrar UoW scoped)
  - `services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroPermissions.cs` (constante `RepertorioCriar`)
  - `seeds/mcad/cadastro.permissions.json` (catálogo e descrição)
  - `seeds/mcad/roles.json` (somente `cadastro.default.analista`)
- **Referência:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxEventWriter.cs`
- **Skills:** dotnet-architecture, dotnet-dependency-config, dotnet-code-quality, dotnet-production-readiness.

## Subtarefas

- [ ] 1.1 Declarar `ICadastroUnitOfWork` e `ICadastroTransaction` conforme a TechSpec.
- [ ] 1.2 Implementar a transação EF Core no mesmo `CadastroDbContext` scoped dos repositórios, audit outbox e Outbox.
- [ ] 1.3 Registrar a implementação no DI, sem mover `DbContext` para Application.
- [ ] 1.4 Adicionar e semear `cadastro:default:repertorio:criar`; garantir que Consultor não a receba.
- [ ] 1.5 Verificar build do serviço.

## Sequenciamento

- Bloqueado por: Nenhum.
- Desbloqueia: 2.0, 3.0 e 4.0.
- Paralelizável: Não — define a infraestrutura compartilhada do fluxo.

## Rastreabilidade

- Esta tarefa cobre: RF-20, RF-21 e RF-22; habilita RF-23.
- Evidência esperada: implementação DI/UoW e seeds de autorização revisáveis.

## Detalhes de Implementação

Preservar a assinatura especificada:

```csharp
Task<ICadastroTransaction> BeginTransactionAsync(CancellationToken cancellationToken);
Task<int> SaveChangesAsync(CancellationToken cancellationToken);
```

`CommitAsync` e `RollbackAsync` devem envolver a transação EF; `AddAsync`, auditoria e `_outbox.AddEvent` apenas acumulam mudanças. A posterior tarefa do handler fará uma única chamada a `SaveChangesAsync` antes de `CommitAsync`. A permissão precisa proteger API e UI; não substituí-la por permissões legadas.

**Convenções da stack:** interfaces no Domain e implementação Infra; DI por construtor; APIs assíncronas recebem e propagam `CancellationToken`; segredos e documentos nunca são registrados em log.

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build services/cadastro-api/Cadastro.sln` conclui sem erro.
- [ ] `rg 'RepertorioCriar|cadastro:default:repertorio:criar' services/cadastro-api seeds/mcad` encontra constante, seed e role do analista.
- [ ] `roles.json` não concede a permissão ao consultor.
- [ ] Não existe migration/tabela/entidade denominada Repertório.
