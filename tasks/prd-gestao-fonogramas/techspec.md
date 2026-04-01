# Tech Spec — F05: Gestão de Fonogramas

> **PRD:** `tasks/prd-gestao-fonogramas/prd.md`
> **API Contract:** `tasks/prd-gestao-fonogramas/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F05
> **Data:** 2026-03-31

---

## Resumo Executivo

Esta Tech Spec cobre a implementação do CRUD de Fonogramas — gravações identificadas por ISRC, vinculadas obrigatoriamente a uma Obra Musical. Introduz o Value Object `Isrc` (validação de formato `CC-XXX-YY-NNNNN`), enum `StatusFonograma` com 4 estados, mecanismo de depuração (mesmo padrão de Obras), e interdependência de status com a obra vinculada. Também conecta o `ObraRepository.PossuiVinculosAsync` com a tabela de fonogramas.

Segue 100% os padrões CQRS e Clean Architecture de F01-F04.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `dotnet-architecture` | Value Object Isrc, CQRS, Repository, entidade com depuração |
| `dotnet-code-quality` | FluentValidation, ProblemDetails |
| `dotnet-testing` | xUnit AAA, Moq, Testcontainers |
| `common/restful-api` | Sub-resources, depuração, paginação |

---

## Arquitetura do Sistema

### Visão Geral

```
services/cadastro-api/
├── 3-Domain/Cadastro.Domain/
│   ├── Entities/Fonograma.cs                ← Entidade com depuração
│   ├── ValueObjects/Isrc.cs                 ← Format CC-XXX-YY-NNNNN
│   ├── Enums/StatusFonograma.cs
│   └── Interfaces/IFonogramaRepository.cs
├── 4-Infra/Cadastro.Infra/
│   ├── Data/Configurations/FonogramaConfiguration.cs
│   ├── Data/Migrations/XXXX_AddFonogramas.cs
│   └── Repositories/FonogramaRepository.cs
├── 2-Application/Cadastro.Application/
│   └── Fonogramas/
│       ├── Commands/ (Criar, Atualizar, Excluir, Depurar)
│       ├── Queries/ (Listar, GetById, ListarPorObra)
│       └── Responses/
└── 1-Services/Cadastro.API/
    └── Endpoints/FonogramaEndpoints.cs      ← 7 endpoints
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Value Object `Isrc` (record) | Encapsula validação de formato e formatação, mesmo padrão de Cpf/Cnpj |
| Self-referencing FK `FonogramaDepuradoParaId` | Mesmo padrão de ObraMusical para depuração |
| Fonogramas da obra sem paginação (array direto) | Volume pequeno por obra (tipicamente < 20 fonogramas) |
| ISRC imutável em LIBERADO (depuração) | Mesmo padrão de título em obras — alteração gera novo registro |
| País e datas editáveis sem depuração | Não são identificadores — não afetam distribuição |
| FK obra imutável (trocar = depuração) | Fonograma é gravação de UMA obra; trocar a obra é conceitualmente outro fonograma |

---

## Design de Implementação

### Value Object Isrc (Domain Layer)

```csharp
// 3-Domain/Cadastro.Domain/ValueObjects/Isrc.cs
public record Isrc
{
    public string Valor { get; }

    private Isrc(string valor) => Valor = valor;

    public static Isrc Create(string valor)
    {
        var limpo = Regex.Replace(valor ?? "", @"[^a-zA-Z0-9]", "").ToUpperInvariant();
        if (limpo.Length != 12 || !IsValid(limpo))
            throw new DomainException("ISRC deve seguir formato CC-XXX-YY-NNNNN (12 caracteres alfanuméricos)");
        return new Isrc(limpo);
    }

    private static bool IsValid(string isrc)
    {
        // Posições 0-1: letras (país)
        if (!char.IsLetter(isrc[0]) || !char.IsLetter(isrc[1])) return false;
        // Posições 2-4: alfanumérico (registrante)
        // Posições 5-6: dígitos (ano)
        if (!char.IsDigit(isrc[5]) || !char.IsDigit(isrc[6])) return false;
        // Posições 7-11: dígitos (número)
        for (int i = 7; i < 12; i++)
            if (!char.IsDigit(isrc[i])) return false;
        return true;
    }

    // BR-ABC-23-12345
    public string Formatado =>
        $"{Valor[..2]}-{Valor[2..5]}-{Valor[5..7]}-{Valor[7..]}";
}
```

### Entidade Fonograma (Domain Layer)

```csharp
public class Fonograma
{
    public Guid Id { get; private set; }
    public Isrc Isrc { get; private set; }
    public Guid ObraId { get; private set; }
    public string PaisOrigem { get; private set; }
    public DateOnly? DataGravacao { get; private set; }
    public DateOnly? DataLancamento { get; private set; }
    public StatusFonograma Status { get; private set; }
    public Guid? FonogramaDepuradoParaId { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    // Navigation
    public ObraMusical Obra { get; private set; }
    public Fonograma? FonogramaDepuradoPara { get; private set; }

    private Fonograma() { } // EF Core

    public static Fonograma Criar(Isrc isrc, Guid obraId, string paisOrigem,
        DateOnly? dataGravacao = null, DateOnly? dataLancamento = null)
    {
        return new Fonograma
        {
            Id = Guid.NewGuid(),
            Isrc = isrc ?? throw new ArgumentNullException(nameof(isrc)),
            ObraId = obraId,
            PaisOrigem = paisOrigem ?? throw new ArgumentNullException(nameof(paisOrigem)),
            DataGravacao = dataGravacao,
            DataLancamento = dataLancamento,
            Status = StatusFonograma.PendenteValidacao,
            FonogramaDepuradoParaId = null,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
    }

    public void Atualizar(Isrc isrc, string paisOrigem, DateOnly? dataGravacao, DateOnly? dataLancamento)
    {
        if (Status == StatusFonograma.Depurado)
            throw new DomainException("Fonogramas depurados não podem ser editados");
        Isrc = isrc ?? throw new ArgumentNullException(nameof(isrc));
        PaisOrigem = paisOrigem ?? throw new ArgumentNullException(nameof(paisOrigem));
        DataGravacao = dataGravacao;
        DataLancamento = dataLancamento;
        AtualizadoEm = DateTime.UtcNow;
    }

    public bool RequerDepuracao(Isrc novoIsrc)
    {
        return Status == StatusFonograma.Liberado && Isrc.Valor != novoIsrc.Valor;
    }

    public void Depurar(Guid novoFonogramaId)
    {
        if (Status != StatusFonograma.Liberado)
            throw new DomainException("Apenas fonogramas LIBERADOS podem ser depurados");
        Status = StatusFonograma.Depurado;
        FonogramaDepuradoParaId = novoFonogramaId;
        AtualizadoEm = DateTime.UtcNow;
    }

    public bool PodeSerExcluido =>
        Status == StatusFonograma.PendenteValidacao || Status == StatusFonograma.PendenteDocumentacao;
}

public enum StatusFonograma
{
    PendenteValidacao,
    PendenteDocumentacao,
    Liberado,
    Depurado
}
```

### Interface IFonogramaRepository

```csharp
public interface IFonogramaRepository
{
    Task<(IEnumerable<Fonograma> Items, int Total)> ListarAsync(FonogramaFiltro filtro, CancellationToken ct);
    Task<IEnumerable<Fonograma>> GetByObraIdAsync(Guid obraId, CancellationToken ct);
    Task<Fonograma?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<bool> ExisteIsrcAsync(string isrc, CancellationToken ct);
    Task<bool> ExisteIsrcAsync(string isrc, Guid excludeId, CancellationToken ct);
    Task<Fonograma> AddAsync(Fonograma fonograma, CancellationToken ct);
    void Update(Fonograma fonograma);
    void Delete(Fonograma fonograma);
    Task SaveChangesAsync(CancellationToken ct);
}

public record FonogramaFiltro(
    int Page = 1, int Size = 20, string? Sort = "isrc",
    string? Isrc = null, Guid? ObraId = null, string? ObraTitulo = null,
    StatusFonograma? Status = null, string? Pais = null);
```

### Schema PostgreSQL

```sql
CREATE TABLE cadastro.fonogramas (
    "Id"                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    "Isrc"                      VARCHAR(12)   NOT NULL,
    "ObraId"                    UUID          NOT NULL REFERENCES cadastro.obras_musicais("Id"),
    "PaisOrigem"                VARCHAR(100)  NOT NULL,
    "DataGravacao"              DATE          NULL,
    "DataLancamento"            DATE          NULL,
    "Status"                    VARCHAR(25)   NOT NULL DEFAULT 'PENDENTE_VALIDACAO',
    "FonogramaDepuradoParaId"   UUID          NULL REFERENCES cadastro.fonogramas("Id"),
    "CriadoEm"                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    "AtualizadoEm"             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_fonogramas_status CHECK ("Status" IN ('PENDENTE_VALIDACAO', 'PENDENTE_DOCUMENTACAO', 'LIBERADO', 'DEPURADO'))
);

CREATE UNIQUE INDEX uq_fonogramas_isrc ON cadastro.fonogramas ("Isrc") WHERE "Isrc" IS NOT NULL;
CREATE INDEX ix_fonogramas_obra ON cadastro.fonogramas ("ObraId");
CREATE INDEX ix_fonogramas_status ON cadastro.fonogramas ("Status");
CREATE INDEX ix_fonogramas_depurado_para ON cadastro.fonogramas ("FonogramaDepuradoParaId") WHERE "FonogramaDepuradoParaId" IS NOT NULL;
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Domain** | | |
| `3-Domain/Cadastro.Domain/ValueObjects/Isrc.cs` | Value Object | Record com validação formato CC-XXX-YY-NNNNN e Formatado |
| `3-Domain/Cadastro.Domain/Entities/Fonograma.cs` | Entidade | Factory Criar, Atualizar, RequerDepuracao, Depurar, PodeSerExcluido |
| `3-Domain/Cadastro.Domain/Enums/StatusFonograma.cs` | Enum | PendenteValidacao, PendenteDocumentacao, Liberado, Depurado |
| `3-Domain/Cadastro.Domain/Interfaces/IFonogramaRepository.cs` | Interface | CRUD + ListarAsync + GetByObraIdAsync + ExisteIsrcAsync |
| **Application — Commands** | | |
| `2-Application/.../Fonogramas/Commands/CriarFonogramaCommand.cs` | Cmd+Handler+Validator | Cria PENDENTE_VALIDACAO, valida ISRC formato + unicidade, valida obra existe |
| `2-Application/.../Fonogramas/Commands/AtualizarFonogramaCommand.cs` | Cmd+Handler+Validator | PENDENTE: edição livre. LIBERADO+ISRC diferente: DepuracaoNecessariaException. País/datas: livre. DEPURADO: rejeita. |
| `2-Application/.../Fonogramas/Commands/ExcluirFonogramaCommand.cs` | Cmd+Handler | Apenas PodeSerExcluido (PENDENTE_*). LIBERADO/DEPURADO: ConflictException |
| `2-Application/.../Fonogramas/Commands/DepurarFonogramaCommand.cs` | Cmd+Handler | Transacional: original→DEPURADO + novo→PENDENTE_VALIDACAO (mesma obra, sem conexos) |
| **Application — Queries** | | |
| `2-Application/.../Fonogramas/Queries/ListarFonogramasQuery.cs` | Query+Handler | Paginação + filtros |
| `2-Application/.../Fonogramas/Queries/GetFonogramaByIdQuery.cs` | Query+Handler | Include Obra |
| `2-Application/.../Fonogramas/Queries/ListarFonogramasPorObraQuery.cs` | Query+Handler | Sem paginação, array direto |
| **Application — Responses** | | |
| `2-Application/.../Fonogramas/Responses/FonogramaResponse.cs` | DTO | Completo: isrc, isrcFormatado, obra aninhada, fonogramaDepuradoParaId |
| `2-Application/.../Fonogramas/Responses/FonogramaResumoResponse.cs` | DTO | Para listagem na obra |
| `2-Application/.../Fonogramas/Responses/FonogramaListResponse.cs` | DTO | data[] + pagination |
| `2-Application/.../Fonogramas/Responses/DepuracaoFonogramaResponse.cs` | DTO | fonogramaDepurado + novoFonograma |
| **Infra** | | |
| `4-Infra/.../Data/Configurations/FonogramaConfiguration.cs` | Config EF | Fluent API, HasConversion Isrc, FKs, self-ref, unique parcial |
| `4-Infra/.../Data/Migrations/XXXX_AddFonogramas.cs` | Migration | Tabela + índices |
| `4-Infra/.../Repositories/FonogramaRepository.cs` | Repository | CRUD + filtros + GetByObraIdAsync |
| **API** | | |
| `1-Services/.../Endpoints/FonogramaEndpoints.cs` | Endpoints | 7 endpoints |
| **Testes** | | |
| `5-Tests/.../ValueObjects/IsrcTests.cs` | Teste | Formato válido/inválido, formatação |
| `5-Tests/.../Fonogramas/FonogramaTests.cs` | Teste | Entidade: Criar, Atualizar, Depurar, PodeSerExcluido |
| `5-Tests/.../Fonogramas/CriarFonogramaHandlerTests.cs` | Teste | Happy path, ISRC inválido, duplicado, obra não existe |
| `5-Tests/.../Fonogramas/AtualizarFonogramaHandlerTests.cs` | Teste | PENDENTE ok, LIBERADO+ISRC→409, país ok em LIBERADO, DEPURADO rejeita |
| `5-Tests/.../Fonogramas/DepurarFonogramaHandlerTests.cs` | Teste | Ok, status != LIBERADO |
| `5-Tests/.../Fonogramas/ExcluirFonogramaHandlerTests.cs` | Teste | PENDENTE ok, LIBERADO/DEPURADO rejeita |
| `5-Tests/Cadastro.IntegrationTests/FonogramaEndpointsTests.cs` | Teste integração | Todos os endpoints |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `4-Infra/.../Data/CadastroDbContext.cs` | Adicionar `DbSet<Fonograma>`, ApplyConfiguration |
| `4-Infra/.../Repositories/ObraRepository.cs` | Atualizar `PossuiVinculosAsync` — adicionar verificação de fonogramas |
| `1-Services/.../Program.cs` | Registrar IFonogramaRepository, MapFonogramaEndpoints() |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `3-Domain/Cadastro.Domain/Entities/ObraMusical.cs` | FK, padrão de depuração |
| `3-Domain/Cadastro.Domain/ValueObjects/Cpf.cs` | Padrão de VO record |
| `2-Application/.../Obras/Commands/DepurarObraCommand.cs` | Padrão de depuração transacional |
| `tasks/prd-gestao-fonogramas/api-contract.yaml` | Contrato |

---

## Análise de Impacto

| Componente | Tipo | Descrição |
|---|---|---|
| ObraRepository.PossuiVinculosAsync | Extensão | Adicionar `|| AnyAsync fonogramas` (obra com fonogramas não pode ser excluída) |
| F06 (Conexos) futuro | Dependência | Participações conexas serão vinculadas ao fonograma; depuração de conexos dispara depuração do fonograma |
| F07 (Status) futuro | Dependência | LIBERADO requer obra LIBERADA + conexos 100% + ISRC |
| D02 (Identificação) futuro | Dependência | Consultará fonogramas por ISRC |

---

## Abordagem de Testes

### Unitários

| Classe | Cenários |
|--------|----------|
| IsrcTests | Formato válido ("BRABC2312345"), inválido ("INVALIDO"), país não-letra, ano não-dígito, Formatado |
| FonogramaTests | Criar (PENDENTE), Atualizar ok + DEPURADO rejeita, RequerDepuracao (true/false), Depurar ok + não LIBERADO, PodeSerExcluido |
| CriarHandler | Happy path, ISRC formato inválido (422), ISRC duplicado (409), obra não existe (404) |
| AtualizarHandler | PENDENTE + ISRC diferente ok, LIBERADO + ISRC diferente → 409, LIBERADO + país ok, DEPURADO rejeita |
| DepurarHandler | Ok (original DEPURADO + novo PENDENTE), status != LIBERADO |
| ExcluirHandler | PENDENTE ok, LIBERADO rejeita, DEPURADO rejeita |

### Integração

| Cenário | Endpoint | Status |
|---------|----------|--------|
| Criar fonograma | POST /fonogramas | 201 |
| ISRC duplicado | POST | 409 |
| ISRC inválido | POST | 422 |
| Listar paginado | GET /fonogramas | 200 |
| Buscar por ID | GET /fonogramas/{id} | 200 (com obra aninhada) |
| Atualizar PENDENTE | PUT | 200 |
| Atualizar LIBERADO + ISRC | PUT | 409 DEPURACAO_NECESSARIA |
| Depurar | POST /depurar | 201 |
| Excluir PENDENTE | DELETE | 204 |
| Excluir LIBERADO | DELETE | 409 |
| Fonogramas da obra | GET /obras/{id}/fonogramas | 200 array |
| Excluir obra com fonogramas | DELETE /obras/{id} | 409 |

---

## Sequenciamento de Desenvolvimento

1. **Domain** — Isrc VO, Fonograma entidade, StatusFonograma, IFonogramaRepository
2. **Infra** — FonogramaConfiguration (HasConversion Isrc), Migration, FonogramaRepository
3. **Infra Fix** — ObraRepository.PossuiVinculosAsync + fonogramas
4. **Application — Queries** — Listar, GetById, ListarPorObra + Responses
5. **Application — Commands** — Criar, Atualizar, Excluir, Depurar + Validators
6. **API** — FonogramaEndpoints (7 endpoints) + Program.cs
7. **Testes unitários** — VO + Entidade + Handlers
8. **Testes integração** — Todos os endpoints

---

## Mapeamento PRD → Implementação

| Requisito | Camada | Implementação |
|-----------|--------|---------------|
| RF-01 (criar) | Domain + Application | Fonograma.Criar + CriarFonogramaCommand |
| RF-02 (ISRC formato) | Domain | Isrc.Create() valida formato |
| RF-03 (ISRC único) | Application + Infra | ExisteIsrcAsync → ConflictException |
| RF-04 (obra obrigatória) | Application | Handler valida obra existe |
| RF-05 (PENDENTE_VALIDACAO) | Domain | Factory retorna StatusFonograma.PendenteValidacao |
| RF-14 (edição livre PENDENTE) | Domain | Atualizar() permite em PENDENTE |
| RF-16 (ISRC LIBERADO → depuração) | Application | RequerDepuracao() → DepuracaoNecessariaException |
| RF-17 (país/datas sem depuração) | Application | Handler compara apenas ISRC |
| RF-18 (depuração transacional) | Application | DepurarFonogramaCommand (mesmo padrão de obra) |
| RF-25 (obra depurada → fonograma fica) | — | Nenhuma lógica necessária — FK mantida |
| RF-28 (exclusão PENDENTE apenas) | Domain | PodeSerExcluido property |

---

*Tech Spec gerada. Para tech spec frontend ou tasks, use as skills correspondentes.*
