---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>identificacao/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>none</dependencies>
<unblocks>"3.0, 4.0"</unblocks>
</task_context>

# Tarefa 2.0: Backend — Domain Layer (Execução, TipoUtilização, Interfaces)

## Relacionada aos Requisitos

- RF-02 — Adicionar execução (factory `Execucao.Criar()`, validação horários)
- RF-05 — Editar execução (método `Execucao.Atualizar()`)
- RF-08 — Cálculo de duração (factory calcula `DuracaoSegundos`)

## Visão Geral

Criar as entidades Execução e TipoUtilização, o enum StatusExecucao, interfaces de repositório e HTTP client no domínio da Identificação. A Execução encapsula a regra de validação de horários e cálculo automático de duração.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Execucao.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/TipoUtilizacao.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Enums/StatusExecucao.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IExecucaoRepository.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/ITipoUtilizacaoRepository.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/ICadastroHttpClient.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Domain/ExecucaoTests.cs`
- **Referência:**
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Captacao.cs` (padrão de entidade)
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Rubrica.cs` (padrão de seed)

## Subtarefas

- [ ] 2.1 Criar enum `StatusExecucao` (Identificada, Pendente)
- [ ] 2.2 Criar entidade `TipoUtilizacao` (seed, factory estático)
- [ ] 2.3 Criar entidade `Execucao` com factory `Criar()`, método `Atualizar()`, validação fim > início, cálculo de duração
- [ ] 2.4 Criar interfaces `IExecucaoRepository`, `ITipoUtilizacaoRepository`, `ICadastroHttpClient`
- [ ] 2.5 Testes unitários `ExecucaoTests.cs`

## Sequenciamento

- Bloqueado por: Nenhum (F01 já existe)
- Desbloqueia: 3.0, 4.0
- Paralelizável: Sim (paralelo com 1.0 e 6.0)

## Detalhes de Implementação

**Execucao.cs:** conforme TechSpec Backend — `TimeOnly` para horários, `DuracaoSegundos` calculado como `(int)(fim.ToTimeSpan() - inicio.ToTimeSpan()).TotalSeconds`.

**ICadastroHttpClient.cs:**
```csharp
public interface ICadastroHttpClient
{
    Task<BuscaCadastroResponse> BuscarAsync(string query, string? tipo, int size, CancellationToken ct);
    Task<ObraResumoDto?> GetObraByIdAsync(Guid obraId, CancellationToken ct);
    Task<FonogramaResumoDto?> GetFonogramaByIdAsync(Guid fonogramaId, CancellationToken ct);
}

public record ObraResumoDto(Guid Id, string Titulo, string? Iswc, string Status);
public record FonogramaResumoDto(Guid Id, Guid ObraId, string Titulo, string? Isrc, string? Interpretes, string Status);
public record BuscaCadastroResponse(IEnumerable<ResultadoBuscaDto> Resultados);
public record ResultadoBuscaDto(string Tipo, Guid Id, Guid? ObraId, string Titulo, string? Isrc, string? Iswc, string? Interpretes, string Status);
```

**Testes unitários — cenários:**
1. `Criar_DadosValidos_RetornaExecucaoComDuracaoCalculada` (14:30→14:33:45 = 225s)
2. `Criar_FimAnteriorAoInicio_LancaDomainException`
3. `Criar_FimIgualAoInicio_LancaDomainException`
4. `Atualizar_RecalculaDuracao`

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/identificacao-api && dotnet build`
- [ ] Testes passam: `cd services/identificacao-api && dotnet test --filter "FullyQualifiedName~ExecucaoTests"`
- [ ] 4 cenários de teste cobertos
- [ ] Duração calculada corretamente (225s para 14:30:00→14:33:45)
