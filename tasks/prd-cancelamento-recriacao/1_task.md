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
<dependencies>database</dependencies>
<unblocks>"2.0, 3.0"</unblocks>
</task_context>

# Tarefa 1.0: Backend — Domain (Captacao: Cancelar, MarcarDistribuicao) + Migration

## Visão Geral

Adicionar campos e métodos à entidade Captação para cancelamento e bloqueio pós-distribuição, gerar migration incremental.

## Arquivos Envolvidos

- **Modificar:**
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Captacao.cs` (4 novos campos + 2 métodos)
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/CaptacaoConfiguration.cs` (mapear novos campos)
- **Criar:**
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Domain/CaptacaoCancelamentoTests.cs`

## Subtarefas

- [ ] 1.1 Adicionar campos à Captacao: `DistribuicaoProcessada` (bool), `DistribuicaoProcessadaEm` (DateTime?), `JustificativaCancelamento` (string?), `CanceladoEm` (DateTime?)
- [ ] 1.2 Adicionar método `Cancelar(justificativa)` — valida FECHADA + não processada → CANCELADA
- [ ] 1.3 Adicionar método `MarcarDistribuicaoProcessada(processadoEm)` — flag true
- [ ] 1.4 Atualizar CaptacaoConfiguration com novos campos
- [ ] 1.5 Gerar migration: `dotnet ef migrations add AddCancelamentoFields`
- [ ] 1.6 Testes `CaptacaoCancelamentoTests` — 4 cenários

## Detalhes de Implementação

**Captacao — novos membros:**
```csharp
public bool DistribuicaoProcessada { get; private set; }
public DateTime? DistribuicaoProcessadaEm { get; private set; }
public string? JustificativaCancelamento { get; private set; }
public DateTime? CanceladoEm { get; private set; }

public void MarcarDistribuicaoProcessada(DateTime processadoEm)
{
    DistribuicaoProcessada = true;
    DistribuicaoProcessadaEm = processadoEm;
}

public void Cancelar(string justificativa)
{
    if (Status != StatusCaptacao.Fechada)
        throw new DomainException("Apenas captações FECHADAS podem ser canceladas.");
    if (DistribuicaoProcessada)
        throw new DomainException("Este Rol já foi processado pela Distribuição e não pode ser cancelado.");

    Status = StatusCaptacao.Cancelada;
    JustificativaCancelamento = justificativa;
    CanceladoEm = DateTime.UtcNow;
    AtualizadoEm = DateTime.UtcNow;
}
```

**Testes (4):**
1. `Cancelar_Fechada_NaoProcessada_StatusCancelada`
2. `Cancelar_Aberta_LancaDomainException`
3. `Cancelar_Processada_LancaDomainException`
4. `MarcarDistribuicaoProcessada_FlagTrue`

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/identificacao-api && dotnet build`
- [ ] Migration gerada com 4 colunas novas
- [ ] Testes: `cd services/identificacao-api && dotnet test --filter "FullyQualifiedName~CaptacaoCancelamento"`
- [ ] 4 cenários cobertos
