---
status: completed
parallelizable: false
blocked_by: []
---

<task_context>
<domain>identificacao/infra</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>dotnet-sdk</dependencies>
<unblocks>"2.0, 3.0, 4.0, 5.0"</unblocks>
</task_context>

# Tarefa 1.0: Backend — Solution, Projetos e Infraestrutura CQRS

## Visão Geral

Criar a solution .NET 8 do serviço Identificação com a estrutura Clean Architecture em 4 camadas, idêntica ao Cadastro. Inclui a infraestrutura CQRS (Dispatcher, interfaces, exceções) que será usada por todas as features do domínio.

## Requisitos

- Solution com 5 projetos (API, Application, Domain, Infra, Tests)
- Referências entre projetos seguindo Clean Architecture (Domain não referencia nada; Infra referencia Domain; Application referencia Domain; API referencia todos)
- Infraestrutura CQRS copiada do Cadastro (sem shared library)
- Exceções de aplicação (NotFoundException, ConflictException, ForbiddenException)

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/Identificacao.sln`
  - `services/identificacao-api/1-Services/Identificacao.API/Identificacao.API.csproj`
  - `services/identificacao-api/2-Application/Identificacao.Application/Identificacao.Application.csproj`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Identificacao.Domain.csproj`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Identificacao.Infra.csproj`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Identificacao.Tests.csproj`
  - `services/identificacao-api/2-Application/Identificacao.Application/Common/ICommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Common/ICommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Common/IQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Common/IQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Common/IDispatcher.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Common/Dispatcher.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Common/Unit.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Common/Exceptions/NotFoundException.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Common/Exceptions/ConflictException.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Common/Exceptions/ForbiddenException.cs`
- **Referência:**
  - `services/cadastro-api/Cadastro.sln` (estrutura de solution)
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/Dispatcher.cs` (implementação CQRS)
  - `services/cadastro-api/1-Services/Cadastro.API/Cadastro.API.csproj` (pacotes NuGet)

## Subtarefas

- [x] 1.1 Criar solution e 5 projetos .csproj com referências corretas
- [x] 1.2 Adicionar pacotes NuGet: EF Core 9 + Npgsql, FluentValidation, Scrutor (mesmas versões do Cadastro)
- [x] 1.3 Criar interfaces CQRS (ICommand, ICommandHandler, IQuery, IQueryHandler, IDispatcher)
- [x] 1.4 Criar Dispatcher (resolução via reflection + DI)
- [x] 1.5 Criar Unit type (retorno de commands sem resultado)
- [x] 1.6 Criar exceções de aplicação (NotFoundException, ConflictException, ForbiddenException)
- [x] 1.7 Verificar que `dotnet build` compila sem erros

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0, 4.0, 5.0
- Paralelizável: Não (é a base de tudo)

## Detalhes de Implementação

**Pacotes NuGet para API.csproj:**
```xml
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" />
<PackageReference Include="Scrutor" />
<PackageReference Include="FluentValidation.DependencyInjectionExtensions" />
```

**Pacotes para Application.csproj:**
```xml
<PackageReference Include="FluentValidation" />
```

**Pacotes para Infra.csproj:**
```xml
<PackageReference Include="Microsoft.EntityFrameworkCore" />
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" />
```

**Pacotes para Tests.csproj:**
```xml
<PackageReference Include="xunit" />
<PackageReference Include="xunit.runner.visualstudio" />
<PackageReference Include="Moq" />
<PackageReference Include="AwesomeAssertions" />
<PackageReference Include="Microsoft.NET.Test.Sdk" />
```

**Dispatcher — copiar padrão do Cadastro:**
```csharp
public class Dispatcher : IDispatcher
{
    private readonly IServiceProvider _serviceProvider;

    public async Task<TResult> QueryAsync<TResult>(IQuery<TResult> query, CancellationToken ct)
    {
        var handlerType = typeof(IQueryHandler<,>).MakeGenericType(query.GetType(), typeof(TResult));
        dynamic handler = _serviceProvider.GetRequiredService(handlerType);
        return await handler.HandleAsync((dynamic)query, ct);
    }

    public async Task<TResult> SendAsync<TResult>(ICommand<TResult> command, CancellationToken ct)
    {
        var handlerType = typeof(ICommandHandler<,>).MakeGenericType(command.GetType(), typeof(TResult));
        dynamic handler = _serviceProvider.GetRequiredService(handlerType);
        return await handler.HandleAsync((dynamic)command, ct);
    }
}
```

**Convenções:**
- Namespaces: `Identificacao.Domain`, `Identificacao.Application`, `Identificacao.Infra`, `Identificacao.API`
- Target framework: `net8.0`
- Nullable enable, implicit usings

## Critérios de Sucesso (Verificáveis)

- [x] Build compila sem erros: `cd services/identificacao-api && dotnet build`
- [x] Testes compilam: `cd services/identificacao-api && dotnet test --no-build --list-tests`
- [x] Solution contém 5 projetos com referências corretas
- [x] Dispatcher resolve handlers via DI (verificável nos testes da Task 4.0)
