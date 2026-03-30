---
status: done
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/setup</domain>
<type>configuration</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>dotnet-sdk</dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 2.0: Estrutura do Projeto .NET (Solution + Projetos + Referências)

## Relacionada às User Stories

- Suporte a todas as HUs — fundação do backend

## Visão Geral

Criar a estrutura Clean Architecture do serviço `cadastro-api` com camadas numeradas, solution, 5 projetos (.csproj), referências entre projetos, pacotes NuGet e arquivos de configuração (.env, .gitignore, appsettings).

## Requisitos

- Solution `Cadastro.sln` na raiz de `services/cadastro-api/`
- 5 projetos: API, Application, Domain, Infra, UnitTests, IntegrationTests
- Referências entre projetos conforme Clean Architecture
- Pacotes NuGet instalados por projeto
- `.env.example` com variáveis de banco
- `.gitignore` para .NET

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/Cadastro.sln`
  - `services/cadastro-api/1-Services/Cadastro.API/Cadastro.API.csproj`
  - `services/cadastro-api/2-Application/Cadastro.Application/Cadastro.Application.csproj`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Cadastro.Domain.csproj`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Cadastro.Infra.csproj`
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/Cadastro.UnitTests.csproj`
  - `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/Cadastro.IntegrationTests.csproj`
  - `services/cadastro-api/.env.example`
  - `services/cadastro-api/.gitignore`
  - `services/cadastro-api/1-Services/Cadastro.API/appsettings.json`
  - `services/cadastro-api/1-Services/Cadastro.API/appsettings.Development.json`
- **Skills para consultar durante implementação:**
  - `dotnet-architecture` — estrutura de pastas, referências, namespaces sem prefixo numérico
  - `dotnet-dependency-config` — pacotes NuGet obrigatórios

## Subtarefas

- [ ] 2.1 Criar solution e projetos via `dotnet new`
- [ ] 2.2 Adicionar projetos à solution via `dotnet sln add`
- [ ] 2.3 Configurar referências entre projetos via `dotnet add reference`
- [ ] 2.4 Instalar pacotes NuGet por projeto:
  - **API:** `Npgsql.EntityFrameworkCore.PostgreSQL`, `Scrutor`, `Microsoft.AspNetCore.Diagnostics.HealthChecks`
  - **Application:** (sem pacotes extras — class library pura)
  - **Infra:** `Microsoft.EntityFrameworkCore`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.EntityFrameworkCore.Design`
  - **UnitTests:** `xUnit`, `Moq`, `AwesomeAssertions`
  - **IntegrationTests:** `Microsoft.AspNetCore.Mvc.Testing`, `Testcontainers.PostgreSql`
- [ ] 2.5 Criar `.env.example` com variáveis de conexão
- [ ] 2.6 Criar `.gitignore` para .NET
- [ ] 2.7 Criar `appsettings.json` e `appsettings.Development.json`
- [ ] 2.8 Verificar build limpo: `dotnet build`

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 3.0
- Paralelizável: Sim — pode executar em paralelo com 1.0 e 8.0

## Detalhes de Implementação

### Referências entre projetos

```
API → Application
Application → Domain
Infra → Domain
API → Infra (para DI registration)
UnitTests → Application + Domain
IntegrationTests → Application + Infra + API
```

### .env.example

```env
CADASTRO_DB_HOST=
CADASTRO_DB_PORT=5432
CADASTRO_DB_NAME=mcad
CADASTRO_DB_SCHEMA=cadastro
CADASTRO_DB_USER=cadastro_svc
CADASTRO_DB_PASSWORD=
ASPNETCORE_ENVIRONMENT=Development
ASPNETCORE_URLS=http://+:5001
```

**Convenções da stack:**
- Namespaces SEM prefixos numéricos: `Cadastro.Application`, não `Cadastro._2_Application`
- Domain project sem dependências externas (zero NuGet packages)
- Instalar `Scrutor` no API project para DI scan automático

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build services/cadastro-api/Cadastro.sln` compila sem erros
- [ ] `dotnet test services/cadastro-api/Cadastro.sln` executa (0 testes, 0 falhas)
- [ ] Solution tem 7 projetos registrados
- [ ] Domain project tem 0 PackageReferences
- [ ] `.env.example` existe com todas as variáveis documentadas
