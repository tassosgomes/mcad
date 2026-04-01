# Tech Spec — F07: Controle de Status

> **PRD:** `tasks/prd-controle-status/prd.md`
> **API Contract:** `tasks/prd-controle-status/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F07
> **Data:** 2026-04-01

---

## Resumo Executivo

Esta Tech Spec cobre a implementação do Controle de Status — a feature que conecta todas as validações do domínio Cadastro. Introduz **Commands de transição de estado** (Liberar, Bloquear, Desbloquear) com validação de pré-requisitos que retorna checklist detalhada, entidade `HistoricoBloqueio` para rastreabilidade, campo `urlAudio` no Fonograma, status BLOQUEADO nos enums existentes, e transição automática de fonograma no CalcularPercentuaisHandler (F06). É uma feature predominantemente de **modificação de código existente** — poucas entidades novas, muitas extensões.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `dotnet-architecture` | Commands de transição, Domain Service de validação |
| `dotnet-code-quality` | ProblemDetails com pendencias[], FluentValidation |
| `dotnet-testing` | Cenários de transição de estado, pré-requisitos |
| `common/restful-api` | Sub-resources de ação, 422 com detalhes |

---

## Arquitetura do Sistema

### Visão Geral

```
services/cadastro-api/
├── 3-Domain/Cadastro.Domain/
│   ├── Entities/HistoricoBloqueio.cs         ← NOVO
│   ├── Enums/StatusObra.cs                   ← MODIFICAR: +Bloqueado
│   ├── Enums/StatusFonograma.cs              ← MODIFICAR: +Bloqueado
│   ├── Services/ValidadorLiberacaoObra.cs    ← NOVO: Domain Service
│   └── Services/ValidadorLiberacaoFonograma.cs ← NOVO: Domain Service
├── 2-Application/Cadastro.Application/
│   └── Status/
│       ├── Commands/ (LiberarObra, BloquearObra, DesbloquearObra,
│       │              LiberarFonograma, BloquearFonograma, DesbloquearFonograma)
│       ├── Queries/ (HistoricoBloqueios)
│       └── Responses/
├── 4-Infra/Cadastro.Infra/
│   ├── Data/Configurations/HistoricoBloqueioConfiguration.cs
│   ├── Data/Migrations/XXXX_AddControleStatus.cs
│   └── Repositories/HistoricoBloqueioRepository.cs
└── 1-Services/Cadastro.API/
    └── Endpoints/StatusEndpoints.cs           ← 8 endpoints
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Domain Services `ValidadorLiberacao*` | Lógica pura de validação de pré-requisitos, testável, retorna lista de pendências |
| `HistoricoBloqueio` como entidade separada | Histórico independente, 1:N com obras/fonogramas, sem poluir entidades principais |
| Status BLOQUEADO adicionado aos enums existentes | Extensão natural — não quebra código existente |
| `bloqueioJustificativa` na entidade principal | Acesso rápido à última justificativa sem JOIN no histórico |
| Transição automática fonograma no CalcularHandler (F06) | Responsabilidade coesa — quem calcula sabe quando está completo |
| 422 com `pendencias[]` (não exception customizada) | Retorna checklist rica para o frontend |

---

## Design de Implementação

### Extensão dos Enums Existentes

```csharp
// StatusObra — ADICIONAR Bloqueado
public enum StatusObra { Pendente, Liberado, Bloqueado, DominioPublico, Depurada }

// StatusFonograma — ADICIONAR Bloqueado
public enum StatusFonograma { PendenteValidacao, PendenteDocumentacao, Liberado, Bloqueado, Depurado }
```

### Extensão da Entidade ObraMusical

```csharp
// Adicionar à ObraMusical existente:
public string? BloqueioJustificativa { get; private set; }

public void Liberar()
{
    if (Status != StatusObra.Pendente)
        throw new DomainException("Apenas obras PENDENTES podem ser liberadas");
    Status = StatusObra.Liberado;
    AtualizadoEm = DateTime.UtcNow;
}

public void Bloquear(string justificativa)
{
    if (Status == StatusObra.Depurada)
        throw new DomainException("Obras depuradas não podem ser bloqueadas");
    if (Status == StatusObra.Bloqueado)
        throw new DomainException("Obra já está bloqueada");
    BloqueioJustificativa = justificativa;
    Status = StatusObra.Bloqueado;
    AtualizadoEm = DateTime.UtcNow;
}

public void Desbloquear()
{
    if (Status != StatusObra.Bloqueado)
        throw new DomainException("Apenas obras BLOQUEADAS podem ser desbloqueadas");
    Status = StatusObra.Pendente; // volta para PENDENTE, não LIBERADO
    BloqueioJustificativa = null;
    AtualizadoEm = DateTime.UtcNow;
}
```

### Extensão da Entidade Fonograma

```csharp
// Adicionar ao Fonograma existente:
public string? UrlAudio { get; private set; }
public string? BloqueioJustificativa { get; private set; }

public void DefinirUrlAudio(string? url)
{
    if (Status == StatusFonograma.Liberado || Status == StatusFonograma.Depurado)
        throw new DomainException("URL de áudio não pode ser alterada em fonogramas liberados ou depurados");
    UrlAudio = url;
    AtualizadoEm = DateTime.UtcNow;
}

public void Liberar()
{
    if (Status != StatusFonograma.PendenteDocumentacao)
        throw new DomainException("Apenas fonogramas em PENDENTE_DOCUMENTACAO podem ser liberados");
    Status = StatusFonograma.Liberado;
    AtualizadoEm = DateTime.UtcNow;
}

public void Bloquear(string justificativa)
{
    if (Status == StatusFonograma.Depurado)
        throw new DomainException("Fonogramas depurados não podem ser bloqueados");
    if (Status == StatusFonograma.Bloqueado)
        throw new DomainException("Fonograma já está bloqueado");
    BloqueioJustificativa = justificativa;
    Status = StatusFonograma.Bloqueado;
    AtualizadoEm = DateTime.UtcNow;
}

public void Desbloquear()
{
    if (Status != StatusFonograma.Bloqueado)
        throw new DomainException("Apenas fonogramas BLOQUEADOS podem ser desbloqueados");
    Status = StatusFonograma.PendenteValidacao;
    BloqueioJustificativa = null;
    AtualizadoEm = DateTime.UtcNow;
}

public void TransicionarParaPendenteDocumentacao()
{
    if (Status != StatusFonograma.PendenteValidacao) return; // silencioso se já avançou
    Status = StatusFonograma.PendenteDocumentacao;
    AtualizadoEm = DateTime.UtcNow;
}

public void RetornarParaPendenteValidacao()
{
    if (Status != StatusFonograma.PendenteDocumentacao) return;
    Status = StatusFonograma.PendenteValidacao;
    AtualizadoEm = DateTime.UtcNow;
}
```

### Domain Services — Validadores de Liberação

```csharp
// 3-Domain/Cadastro.Domain/Services/ValidadorLiberacaoObra.cs
public static class ValidadorLiberacaoObra
{
    public static IReadOnlyList<PreRequisito> Validar(
        ObraMusical obra, decimal somaTitularidades, bool temIswc)
    {
        var pendencias = new List<PreRequisito>();
        pendencias.Add(new("Título", !string.IsNullOrWhiteSpace(obra.Titulo)));
        pendencias.Add(new("Tipo", obra.Tipo != default));
        pendencias.Add(new("ISWC", temIswc, temIswc ? null : "ISWC não obtido"));
        pendencias.Add(new("Titularidades", somaTitularidades == 100.0000m,
            somaTitularidades != 100.0000m ? $"Soma ({somaTitularidades}%) diferente de 100%" : null));
        return pendencias;
    }
}

// 3-Domain/Cadastro.Domain/Services/ValidadorLiberacaoFonograma.cs
public static class ValidadorLiberacaoFonograma
{
    public static IReadOnlyList<PreRequisito> Validar(
        Fonograma fonograma, decimal somaConexos, bool obraLiberada)
    {
        var pendencias = new List<PreRequisito>();
        pendencias.Add(new("ISRC", fonograma.Isrc != null));
        pendencias.Add(new("Participações Conexas", somaConexos == 100.0000m,
            somaConexos != 100.0000m ? $"Soma ({somaConexos}%) diferente de 100%" : null));
        pendencias.Add(new("Obra LIBERADA", obraLiberada,
            !obraLiberada ? "Obra vinculada não está LIBERADA" : null));
        pendencias.Add(new("URL Áudio", !string.IsNullOrWhiteSpace(fonograma.UrlAudio),
            string.IsNullOrWhiteSpace(fonograma.UrlAudio) ? "URL de áudio não preenchida" : null));
        return pendencias;
    }
}

public record PreRequisito(string Item, bool Atendido, string? Detalhe = null);
```

### Entidade HistoricoBloqueio

```csharp
public class HistoricoBloqueio
{
    public Guid Id { get; private set; }
    public string EntidadeTipo { get; private set; }  // "OBRA" ou "FONOGRAMA"
    public Guid EntidadeId { get; private set; }
    public string Acao { get; private set; }           // "BLOQUEIO" ou "DESBLOQUEIO"
    public string? Justificativa { get; private set; }
    public DateTime DataHora { get; private set; }

    private HistoricoBloqueio() { }

    public static HistoricoBloqueio CriarBloqueio(string entidadeTipo, Guid entidadeId, string justificativa)
    {
        return new HistoricoBloqueio
        {
            Id = Guid.NewGuid(),
            EntidadeTipo = entidadeTipo,
            EntidadeId = entidadeId,
            Acao = "BLOQUEIO",
            Justificativa = justificativa,
            DataHora = DateTime.UtcNow,
        };
    }

    public static HistoricoBloqueio CriarDesbloqueio(string entidadeTipo, Guid entidadeId)
    {
        return new HistoricoBloqueio
        {
            Id = Guid.NewGuid(),
            EntidadeTipo = entidadeTipo,
            EntidadeId = entidadeId,
            Acao = "DESBLOQUEIO",
            Justificativa = null,
            DataHora = DateTime.UtcNow,
        };
    }
}
```

### Transição Automática no CalcularPercentuaisHandler (F06)

```csharp
// Modificar CalcularPercentuaisCommandHandler existente:
// Após CalculadoraConexos.Calcular(participacoes):

var somaTotal = participacoes.Sum(p => p.Percentual ?? 0);
if (somaTotal == 100.0000m)
    fonograma.TransicionarParaPendenteDocumentacao();

fonograma.MarcarPercentuaisAtualizados();
await _participacaoRepo.SaveChangesAsync(ct);
```

### Schema PostgreSQL — Adições

```sql
-- Coluna em obras_musicais
ALTER TABLE cadastro.obras_musicais ADD COLUMN "BloqueioJustificativa" VARCHAR(500) NULL;
ALTER TABLE cadastro.obras_musicais DROP CONSTRAINT ck_obras_status;
ALTER TABLE cadastro.obras_musicais ADD CONSTRAINT ck_obras_status
    CHECK ("Status" IN ('PENDENTE', 'LIBERADO', 'BLOQUEADO', 'DOMINIO_PUBLICO', 'DEPURADA'));

-- Colunas em fonogramas
ALTER TABLE cadastro.fonogramas ADD COLUMN "UrlAudio" VARCHAR(500) NULL;
ALTER TABLE cadastro.fonogramas ADD COLUMN "BloqueioJustificativa" VARCHAR(500) NULL;
ALTER TABLE cadastro.fonogramas DROP CONSTRAINT ck_fonogramas_status;
ALTER TABLE cadastro.fonogramas ADD CONSTRAINT ck_fonogramas_status
    CHECK ("Status" IN ('PENDENTE_VALIDACAO', 'PENDENTE_DOCUMENTACAO', 'LIBERADO', 'BLOQUEADO', 'DEPURADO'));

-- Tabela histórico
CREATE TABLE cadastro.historico_bloqueios (
    "Id"              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    "EntidadeTipo"    VARCHAR(15)   NOT NULL,
    "EntidadeId"      UUID          NOT NULL,
    "Acao"            VARCHAR(15)   NOT NULL,
    "Justificativa"   VARCHAR(500)  NULL,
    "DataHora"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_historico_tipo CHECK ("EntidadeTipo" IN ('OBRA', 'FONOGRAMA')),
    CONSTRAINT ck_historico_acao CHECK ("Acao" IN ('BLOQUEIO', 'DESBLOQUEIO'))
);
CREATE INDEX ix_historico_entidade ON cadastro.historico_bloqueios ("EntidadeTipo", "EntidadeId");
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Domain** | | |
| `3-Domain/.../Entities/HistoricoBloqueio.cs` | Entidade | Factory CriarBloqueio, CriarDesbloqueio |
| `3-Domain/.../Services/ValidadorLiberacaoObra.cs` | Domain Service | Valida pré-requisitos → lista PreRequisito |
| `3-Domain/.../Services/ValidadorLiberacaoFonograma.cs` | Domain Service | Valida pré-requisitos fonograma |
| `3-Domain/.../Services/PreRequisito.cs` | Record | Item, Atendido, Detalhe |
| `3-Domain/.../Interfaces/IHistoricoBloqueioRepository.cs` | Interface | Add, GetByEntidade |
| **Application — Commands** | | |
| `2-Application/.../Status/Commands/LiberarObraCommand.cs` + Handler | Cmd | Valida pré-requisitos, obra.Liberar() |
| `2-Application/.../Status/Commands/BloquearObraCommand.cs` + Handler + Validator | Cmd | justificativa obrigatória, obra.Bloquear() + histórico |
| `2-Application/.../Status/Commands/DesbloquearObraCommand.cs` + Handler | Cmd | obra.Desbloquear() + histórico |
| `2-Application/.../Status/Commands/LiberarFonogramaCommand.cs` + Handler | Cmd | Valida pré-requisitos fonograma |
| `2-Application/.../Status/Commands/BloquearFonogramaCommand.cs` + Handler + Validator | Cmd | justificativa + histórico |
| `2-Application/.../Status/Commands/DesbloquearFonogramaCommand.cs` + Handler | Cmd | fonograma.Desbloquear() + histórico |
| **Application — Queries** | | |
| `2-Application/.../Status/Queries/HistoricoBloqueiosQuery.cs` + Handler | Query | Lista por entidade |
| **Application — Responses** | | |
| `2-Application/.../Status/Responses/PreRequisitosResponse.cs` | DTO | Lista pendências para 422 |
| `2-Application/.../Status/Responses/HistoricoBloqueioResponse.cs` | DTO | Item do histórico |
| **Application — Exceptions** | | |
| `2-Application/.../Common/Exceptions/PreRequisitosException.cs` | Exception | 422 com pendências[] |
| **Infra** | | |
| `4-Infra/.../Data/Configurations/HistoricoBloqueioConfiguration.cs` | Config EF | Fluent API |
| `4-Infra/.../Data/Migrations/XXXX_AddControleStatus.cs` | Migration | Colunas + tabela + CHECK constraints |
| `4-Infra/.../Repositories/HistoricoBloqueioRepository.cs` | Repository | Add, GetByEntidade |
| **API** | | |
| `1-Services/.../Endpoints/StatusEndpoints.cs` | Endpoints | 8 endpoints |
| **Testes** | | |
| `5-Tests/.../Status/ValidadorLiberacaoObraTests.cs` | Teste | Cenários de pré-requisitos |
| `5-Tests/.../Status/ValidadorLiberacaoFonogramaTests.cs` | Teste | Cenários de pré-requisitos |
| `5-Tests/.../Status/LiberarObraHandlerTests.cs` | Teste | Sucesso, pendências, status inválido |
| `5-Tests/.../Status/BloquearObraHandlerTests.cs` | Teste | Sucesso, justificativa curta, DEPURADA |
| `5-Tests/.../Status/LiberarFonogramaHandlerTests.cs` | Teste | Sucesso, pendências, obra não LIBERADA |
| `5-Tests/.../Status/BloquearFonogramaHandlerTests.cs` | Teste | Sucesso |
| `5-Tests/Cadastro.IntegrationTests/StatusEndpointsTests.cs` | Teste integração | Todos os endpoints |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `3-Domain/.../Enums/StatusObra.cs` | Adicionar `Bloqueado` |
| `3-Domain/.../Enums/StatusFonograma.cs` | Adicionar `Bloqueado` |
| `3-Domain/.../Entities/ObraMusical.cs` | +BloqueioJustificativa, +Liberar(), +Bloquear(), +Desbloquear(). Atualizar Atualizar()/RequerDepuracao() para rejeitar BLOQUEADO. |
| `3-Domain/.../Entities/Fonograma.cs` | +UrlAudio, +BloqueioJustificativa, +Liberar(), +Bloquear(), +Desbloquear(), +TransicionarPendenteDocumentacao(), +RetornarPendenteValidacao(), +DefinirUrlAudio() |
| `4-Infra/.../Data/CadastroDbContext.cs` | +DbSet<HistoricoBloqueio>, ApplyConfiguration |
| `4-Infra/.../Data/Configurations/ObraMusicalConfiguration.cs` | +BloqueioJustificativa VARCHAR(500), atualizar CHECK constraint status |
| `4-Infra/.../Data/Configurations/FonogramaConfiguration.cs` | +UrlAudio VARCHAR(500), +BloqueioJustificativa, atualizar CHECK constraint status |
| `2-Application/.../Participacoes/Commands/CalcularPercentuaisCommandHandler.cs` | Após cálculo com soma=100% → fonograma.TransicionarParaPendenteDocumentacao() |
| `2-Application/.../Fonogramas/Commands/AtualizarFonogramaCommandHandler.cs` | Aceitar urlAudio no update |
| `2-Application/.../Fonogramas/Responses/FonogramaResponse.cs` | +urlAudio, +bloqueioJustificativa |
| `2-Application/.../Obras/Responses/ObraResponse.cs` | +bloqueioJustificativa |
| `1-Services/.../Program.cs` | Registrar IHistoricoBloqueioRepository, MapStatusEndpoints() |
| `1-Services/.../Infrastructure/GlobalExceptionHandler.cs` | Adicionar PreRequisitosException → 422 com pendencias[] |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `3-Domain/.../Services/CalculadoraConexos.cs` | Padrão Domain Service |
| `2-Application/.../Obras/Commands/` | Padrão Commands de ação |
| `tasks/prd-controle-status/api-contract.yaml` | Contrato |

---

## Análise de Impacto

| Componente | Tipo | Descrição |
|---|---|---|
| StatusObra enum | Extensão | +Bloqueado — impacta CHECK constraint, filtros, badges |
| StatusFonograma enum | Extensão | +Bloqueado — idem |
| ObraMusical entidade | Extensão significativa | +3 métodos, +1 propriedade, atualizar guard em Atualizar() |
| Fonograma entidade | Extensão significativa | +6 métodos, +2 propriedades |
| CalcularPercentuaisHandler (F06) | Extensão | Transição automática PENDENTE_VALIDACAO → PENDENTE_DOCUMENTACAO |
| AtualizarFonogramaHandler (F05) | Extensão | Aceitar urlAudio |
| GlobalExceptionHandler | Extensão | +PreRequisitosException → 422 com pendencias[] |
| Frontend ObraDetailPage | Impacto | Botões Liberar/Bloquear/Desbloquear, banner de bloqueio |
| Frontend FonogramaDetailPage | Impacto | Botões + campo urlAudio + banner |

---

## Abordagem de Testes

### Unitários — Validadores (CRÍTICO)

| Cenário | Validador | Expected |
|---------|-----------|----------|
| Obra completa | ValidadorLiberacaoObra | Todos atendido=true |
| Sem ISWC | ValidadorLiberacaoObra | ISWC atendido=false |
| Soma 80% | ValidadorLiberacaoObra | Titularidades atendido=false, detalhe "80%" |
| Fonograma completo + obra LIBERADA | ValidadorLiberacaoFonograma | Todos atendido=true |
| Obra PENDENTE | ValidadorLiberacaoFonograma | Obra atendido=false |
| Sem áudio | ValidadorLiberacaoFonograma | URL Áudio atendido=false |

### Unitários — Entidades

| Cenário | Expected |
|---------|----------|
| Liberar obra PENDENTE | StatusObra.Liberado |
| Liberar obra BLOQUEADO | DomainException |
| Bloquear obra DEPURADA | DomainException |
| Desbloquear obra BLOQUEADO | StatusObra.Pendente |
| Liberar fonograma PENDENTE_DOCUMENTACAO | StatusFonograma.Liberado |
| Liberar fonograma PENDENTE_VALIDACAO | DomainException |

### Integração

| Cenário | Endpoint | Status |
|---------|----------|--------|
| Liberar obra completa | POST /liberar | 200 |
| Liberar obra sem ISWC | POST /liberar | 422 com pendencias |
| Bloquear obra | POST /bloquear | 200 |
| Bloquear sem justificativa | POST /bloquear | 400 |
| Desbloquear | POST /desbloquear | 200 → PENDENTE |
| Liberar fonograma completo | POST /liberar | 200 |
| Liberar fonograma obra PENDENTE | POST /liberar | 422 |
| Histórico bloqueios | GET /historico | 200 array |

---

## Sequenciamento de Desenvolvimento

1. **Domain** — Enums (+Bloqueado), HistoricoBloqueio, PreRequisito record, ValidadorLiberacaoObra, ValidadorLiberacaoFonograma
2. **Domain** — Extensão ObraMusical (Liberar, Bloquear, Desbloquear, BloqueioJustificativa)
3. **Domain** — Extensão Fonograma (UrlAudio, Liberar, Bloquear, Desbloquear, transições)
4. **Infra** — HistoricoBloqueioConfiguration, Migration, Repository, atualizar Configurations existentes
5. **Application** — PreRequisitosException, Responses (PreRequisitosResponse, HistoricoBloqueioResponse)
6. **Application** — Commands Obra (Liberar, Bloquear, Desbloquear)
7. **Application** — Commands Fonograma (Liberar, Bloquear, Desbloquear)
8. **Application Fix** — CalcularPercentuaisHandler (transição automática), AtualizarFonogramaHandler (urlAudio), Responses existentes (+campos)
9. **API** — StatusEndpoints + Program.cs + GlobalExceptionHandler
10. **Testes unitários** — Validadores + Entidades + Handlers
11. **Testes integração**

---

*Tech Spec gerada. Para tech spec frontend ou tasks, use as skills correspondentes.*
