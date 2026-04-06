---
status: completed
parallelizable: false
blocked_by: [1.0]
---

<task_context>
<domain>identificacao/domain+infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 2.0: Backend — Domain (Captacao.Fechar) + Infra (novos métodos repo)

## Visão Geral

Adicionar método `Fechar()` à entidade Captação e implementar métodos de contagem no ExecucaoRepository para validação de pré-requisitos (sem tipo utilização, sem horário, listar todas).

## Arquivos Envolvidos

- **Modificar:**
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Captacao.cs` (adicionar `Fechar()`)
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IExecucaoRepository.cs` (3 novos métodos)
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/ExecucaoRepository.cs` (implementar)

## Subtarefas

- [x] 2.1 Adicionar `Captacao.Fechar()` — valida ABERTA, transiciona para FECHADA
- [x] 2.2 Adicionar ao IExecucaoRepository: `ContarSemTipoUtilizacaoAsync`, `ContarSemHorarioAsync`, `ListarTodasDaCaptacaoAsync`
- [x] 2.3 Implementar os 3 métodos no ExecucaoRepository

## Sequenciamento

- Bloqueado por: 1.0 (Outbox precisa existir para a transação atômica)
- Desbloqueia: 3.0
- Paralelizável: Não

## Detalhes de Implementação

**Captacao.Fechar():**
```csharp
public void Fechar()
{
    ValidarAberta();
    Status = StatusCaptacao.Fechada;
    AtualizadoEm = DateTime.UtcNow;
}
```

**ExecucaoRepository — novos métodos:**
```csharp
public Task<int> ContarSemTipoUtilizacaoAsync(Guid captacaoId, CancellationToken ct)
    => _context.Execucoes.CountAsync(e =>
        e.CaptacaoId == captacaoId && e.TipoUtilizacaoId == null, ct);

public Task<int> ContarSemHorarioAsync(Guid captacaoId, CancellationToken ct)
    => _context.Execucoes.CountAsync(e =>
        e.CaptacaoId == captacaoId && (e.Inicio == default || e.Fim == default), ct);

public async Task<IEnumerable<Execucao>> ListarTodasDaCaptacaoAsync(Guid captacaoId, CancellationToken ct)
    => await _context.Execucoes
        .Where(e => e.CaptacaoId == captacaoId)
        .Include(e => e.TipoUtilizacao)
        .AsNoTracking()
        .ToListAsync(ct);
```

## Critérios de Sucesso (Verificáveis)

- [x] Build: `cd services/identificacao-api && dotnet build`
- [x] Captacao.Fechar() transiciona ABERTA → FECHADA
- [x] Fechar() em captação não ABERTA lança DomainException
