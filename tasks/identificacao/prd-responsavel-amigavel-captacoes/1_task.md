---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>engine/infra/domain/identidade</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>none</dependencies>
<unblocks>"2.0", "3.0", "5.0", "6.0"</unblocks>
</task_context>

# Tarefa 1.0: AnalistaIdentificador + refactor de UserContextExtensions

## Visão Geral

Hoje a conversão `sub (JWT) → Guid` vive embutida em `UserContextExtensions.GetAnalistaId` (`1-Services/.../Infrastructure/UserContextExtensions.cs`), duplicando conhecimento que combo (F1), cadastro (F2) e backfill (F3) precisarão reproduzir. Esta tarefa **extrai essa regra para um helper de domínio puro** (`AnalistaIdentificador`) e faz `GetAnalistaId` delegar a ele, tornando-o a única fonte da verdade.

É a base de tudo: sem a conversão unificada, os IDs da combo, do cadastro e do backfill não casariam com os IDs já gravados nas captações.

> **Por que não `md5()::uuid` no SQL?** O `Guid(byte[])` do .NET usa ordem de bytes mista (mixed-endian) nos primeiros três componentes, então o Guid gerado **não** equivale ao `md5()::uuid` do PostgreSQL. A conversão precisa ficar em código .NET.

## Requisitos

- Criar helper estático puro `AnalistaIdentificador.FromSubject(string subject) : Guid` em **Domain**.
- Regra idêntica à atual: se `subject` for um Guid válido, devolvê-lo; senão, `new Guid(MD5.HashData(UTF8(subject)))`.
- Refatorar `UserContextExtensions.GetAnalistaId` para delegar a `AnalistaIdentificador.FromSubject` (sem mudar comportamento).
- **Não** quebrar o build: nenhum contrato público existente muda nesta tarefa.
- Não mexer em `GetAnalistaNome` nesta tarefa (isso fica para a Tarefa 5.0 / F2).

## Subtarefas

- [ ] 1.1 Criar `3-Domain/Identificacao.Domain/Identidade/AnalistaIdentificador.cs` (helper estático `FromSubject`).
- [ ] 1.2 Refatorar `1-Services/Identificacao.API/Infrastructure/UserContextExtensions.cs`: `GetAnalistaId` passa a chamar `AnalistaIdentificador.FromSubject(sub)` (manter o `throw UnauthorizedAccessException` quando `sub` ausente).
- [ ] 1.3 Remover de `UserContextExtensions` o `using System.Security.Cryptography` / `System.Text` se não mais usados (manter apenas o necessário).
- [ ] 1.4 Testes unitários `5-Tests/Cadastro.UnitTests` (ou `Identificacao.UnitTests`):
  - `FromSubject` é **determinístico** (mesmo `sub` → mesmo Guid).
  - `sub` que é um Guid válido é **preservado** sem hashear.
  - **Igualdade com o Guid que `GetAnalistaId` produzia antes**: para um `sub` arbitrário (não-Guid), o novo `FromSubject` == valor histórico gerado pela fórmula `new Guid(MD5.HashData(...))` (regressão que garante casamento com dados já gravados).
- [ ] 1.5 `dotnet build` da solução identificacao-api sem erros; `dotnet test` nos unitários verde.

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0 (não depende tecnicamente, mas abre a trilha), 3.0, 5.0, 6.0
- Paralelizável: **Sim** — pode rodar em paralelo com **2.0** (arquivos totalmente disjuntos; a entidade de read model não usa `AnalistaIdentificador`).

## Detalhes de Implementação

```csharp
// 3-Domain/Identificacao.Domain/Identidade/AnalistaIdentificador.cs
using System.Security.Cryptography;
using System.Text;

namespace Identificacao.Domain.Identidade;

public static class AnalistaIdentificador
{
    public static Guid FromSubject(string subject) =>
        Guid.TryParse(subject, out var guid) ? guid
            : new Guid(MD5.HashData(Encoding.UTF8.GetBytes(subject)));
}
```

Refatora (mesmo arquivo atual `UserContextExtensions.cs`):

```csharp
public static Guid GetAnalistaId(this ClaimsPrincipal user)
{
    var sub = user.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("Usuário ausente no token");
    return AnalistaIdentificador.FromSubject(sub);
}
```

## Critérios de Sucesso

- `AnalistaIdentificador.FromSubject` existe em Domain e é a única implementação da regra `sub → Guid`.
- `GetAnalistaId` delega ao helper; comportamento inalterado para tokens existentes.
- Teste de regressão prova que `FromSubject("abc-123")` == Guid histórico (casamento com `Captacao.AnalistaResponsavelId` já gravados).
- Build verde e unitários passando.
