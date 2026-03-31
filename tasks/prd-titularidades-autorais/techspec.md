# Tech Spec — F04: Titularidades Autorais

> **PRD:** `tasks/prd-titularidades-autorais/prd.md`
> **API Contract:** `tasks/prd-titularidades-autorais/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F04
> **Data:** 2026-03-31

---

## Resumo Executivo

Esta Tech Spec cobre a implementação das Titularidades Autorais — tabela de junção many-to-many entre Obras e Titulares com categoria (Autor/Editor) e percentual. É a primeira feature a implementar a regra de negócio mais crítica do Cadastro: **soma dos percentuais = 100%**. Também conecta o mecanismo de depuração (F03) às alterações de titularidade, e habilita a obtenção de ISWC (F03) ao fornecer os dados de titulares e associação.

Segue os padrões CQRS estabelecidos em F01-F03 e introduz: entidade de junção com validação de domínio, endpoint de autocomplete reutilizável, e responses que retornam o estado completo (lista + soma) após cada mutation.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `dotnet-architecture` | Entidade de junção, CQRS, Repository |
| `dotnet-code-quality` | FluentValidation, validação de domínio (Editor=PJ) |
| `dotnet-testing` | xUnit AAA, Moq, Testcontainers |
| `common/restful-api` | Sub-resources, ProblemDetails |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
services/cadastro-api/
├── 3-Domain/Cadastro.Domain/
│   ├── Entities/TitularidadeAutoral.cs      ← Entidade de junção
│   ├── Enums/CategoriaAutoral.cs            ← Autor, Editor
│   └── Interfaces/ITitularidadeRepository.cs
├── 4-Infra/Cadastro.Infra/
│   ├── Data/Configurations/TitularidadeAutoralConfiguration.cs
│   ├── Data/Migrations/XXXX_AddTitularidadesAutorais.cs
│   └── Repositories/TitularidadeRepository.cs
├── 2-Application/Cadastro.Application/
│   └── Titularidades/
│       ├── Commands/ (Adicionar, Editar, Remover)
│       ├── Queries/ (Listar, BuscarTitulares)
│       └── Responses/
└── 1-Services/Cadastro.API/
    └── Endpoints/TitularidadeEndpoints.cs   ← Sub-resource de Obras
```

### Fluxo de Dados — Adicionar Titularidade

```
POST /api/v1/obras/{obraId}/titularidades
  → TitularidadeEndpoints → Dispatcher.SendAsync(AdicionarTitularidadeCommand)
  → Handler:
    1. Busca obra → valida status (se LIBERADO → DepuracaoNecessariaException)
    2. Busca titular → valida existe
    3. Valida: Editor exige PJ (RN-11)
    4. Valida: mesmo titular+categoria não duplicado
    5. Cria TitularidadeAutoral(obraId, titularId, categoria, percentual)
    6. SaveChangesAsync
    7. Recalcula soma de todas as titularidades da obra
    8. Retorna TitularidadesResponse (lista completa + soma)
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Entidade `TitularidadeAutoral` (não tabela de junção EF implícita) | Tem atributos próprios (categoria, percentual) — é uma entidade, não uma relação simples |
| Soma calculada no handler (não no banco) | Precisão decimal + algoritmo de arredondamento RN-12 controlados em C# |
| Todas as mutations retornam TitularidadesResponse completo | Frontend atualiza tabela + soma em um request |
| DELETE retorna 200 com body (não 204) | Retorna soma atualizada sem GET adicional |
| Autocomplete em `/titulares/busca` (não sub-resource) | Reutilizável por F06 (Conexos) |
| Depuração verificada antes de persistir | Intercepta no handler, não no endpoint |

---

## Design de Implementação

### Entidade TitularidadeAutoral (Domain)

```csharp
public class TitularidadeAutoral
{
    public Guid Id { get; private set; }
    public Guid ObraId { get; private set; }
    public Guid TitularId { get; private set; }
    public CategoriaAutoral Categoria { get; private set; }
    public decimal Percentual { get; private set; }
    public DateTime CriadoEm { get; private set; }

    // Navigation
    public ObraMusical Obra { get; private set; }
    public Titular Titular { get; private set; }

    private TitularidadeAutoral() { } // EF Core

    public static TitularidadeAutoral Criar(Guid obraId, Guid titularId,
        CategoriaAutoral categoria, decimal percentual)
    {
        if (percentual <= 0 || percentual > 100)
            throw new DomainException("Percentual deve estar entre 0.0001 e 100.0000");

        return new TitularidadeAutoral
        {
            Id = Guid.NewGuid(),
            ObraId = obraId,
            TitularId = titularId,
            Categoria = categoria,
            Percentual = Math.Round(percentual, 4),
            CriadoEm = DateTime.UtcNow,
        };
    }

    public void AlterarPercentual(decimal novoPercentual)
    {
        if (novoPercentual <= 0 || novoPercentual > 100)
            throw new DomainException("Percentual deve estar entre 0.0001 e 100.0000");
        Percentual = Math.Round(novoPercentual, 4);
    }
}

public enum CategoriaAutoral { Autor, Editor }
```

### Interface ITitularidadeRepository

```csharp
public interface ITitularidadeRepository
{
    Task<IEnumerable<TitularidadeAutoral>> GetByObraIdAsync(Guid obraId, CancellationToken ct);
    Task<TitularidadeAutoral?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<bool> ExisteDuplicataAsync(Guid obraId, Guid titularId, CategoriaAutoral categoria, CancellationToken ct);
    Task<TitularidadeAutoral> AddAsync(TitularidadeAutoral titularidade, CancellationToken ct);
    void Update(TitularidadeAutoral titularidade);
    void Delete(TitularidadeAutoral titularidade);
    Task<decimal> CalcularSomaAsync(Guid obraId, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
```

### Cálculo da Soma + Arredondamento (RN-12)

```csharp
// No handler, após qualquer mutation:
var titularidades = await _repo.GetByObraIdAsync(obraId, ct);
var soma = titularidades.Sum(t => t.Percentual);
var somaCompleta = soma == 100.0000m;

return new TitularidadesResponse(obraId, MapToItems(titularidades), soma, somaCompleta);
```

> **Nota sobre RN-12:** O arredondamento (truncar 4 casas + diferença no primeiro) é aplicado no contexto de Distribuição (D04), não no Cadastro. Aqui armazenamos os percentuais exatos informados pelo Analista. O indicador visual `somaCompleta` é uma verificação simples `== 100.0000m`.

### Schema PostgreSQL

```sql
CREATE TABLE cadastro.titularidades_autorais (
    "Id"          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    "ObraId"      UUID          NOT NULL REFERENCES cadastro.obras_musicais("Id"),
    "TitularId"   UUID          NOT NULL REFERENCES cadastro.titulares("Id"),
    "Categoria"   VARCHAR(10)   NOT NULL,
    "Percentual"  DECIMAL(8,4)  NOT NULL,
    "CriadoEm"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_titularidades_categoria CHECK ("Categoria" IN ('AUTOR', 'EDITOR')),
    CONSTRAINT ck_titularidades_percentual CHECK ("Percentual" > 0 AND "Percentual" <= 100),
    CONSTRAINT uq_titularidades_obra_titular_categoria UNIQUE ("ObraId", "TitularId", "Categoria")
);

CREATE INDEX ix_titularidades_obra ON cadastro.titularidades_autorais ("ObraId");
CREATE INDEX ix_titularidades_titular ON cadastro.titularidades_autorais ("TitularId");
```

### Autocomplete (Query — reutilizável)

```csharp
// GET /api/v1/titulares/busca?q=djavan&limit=10
public record BuscarTitularesQuery(string Q, int Limit = 10)
    : IQuery<IEnumerable<TitularResumoResponse>>;

// Handler: busca por nome (ILike) ou documento (Contains), top N
```

### Integração com Depuração (F03)

Os handlers de Add/Edit/Remove verificam o status da obra:

```csharp
var obra = await _obraRepo.GetByIdAsync(cmd.ObraId, ct)
    ?? throw new NotFoundException(nameof(ObraMusical), cmd.ObraId);

if (obra.Status == StatusObra.Depurada)
    throw new DomainException("Obras depuradas não podem ser alteradas");

if (obra.Status == StatusObra.Liberado)
    throw new DepuracaoNecessariaException(
        "Alterar titulares de uma obra LIBERADA requer depuração");

// ... prossegue com a operação para PENDENTE
```

### Integração com ISWC (F03)

O `ObterIswcCommandHandler` (F03) agora pode consultar titularidades reais:

```csharp
// Em ObterIswcCommandHandler (modificar):
var titularidades = await _titularidadeRepo.GetByObraIdAsync(obra.Id, ct);
if (!titularidades.Any())
    throw new ValidationException("Obra deve ter ao menos um titular autoral");

var autores = titularidades
    .OrderByDescending(t => t.Percentual)
    .ThenBy(t => t.CriadoEm) // desempate: primeiro cadastrado
    .Select(t => t.Titular.Nome);

var titularMaiorPercentual = titularidades
    .OrderByDescending(t => t.Percentual)
    .ThenBy(t => t.CriadoEm)
    .First();

var associacaoSigla = titularMaiorPercentual.Titular.Associacao.Sigla;
```

### Impacto no PossuiVinculosAsync

`IObraRepository.PossuiVinculosAsync` e `ITitularRepository.PossuiVinculosAsync` agora podem verificar a tabela `titularidades_autorais`:

```csharp
// ObraRepository.PossuiVinculosAsync — agora real (não placeholder)
return await _context.TitularidadesAutorais.AnyAsync(t => t.ObraId == obraId, ct)
    || await _context.Fonogramas.AnyAsync(f => f.ObraId == obraId, ct); // F05 futuro

// TitularRepository.PossuiVinculosAsync — agora real
return await _context.TitularidadesAutorais.AnyAsync(t => t.TitularId == titularId, ct);
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Domain** | | |
| `3-Domain/Cadastro.Domain/Entities/TitularidadeAutoral.cs` | Entidade | Junção obra↔titular com categoria, percentual, factory Criar, AlterarPercentual |
| `3-Domain/Cadastro.Domain/Enums/CategoriaAutoral.cs` | Enum | Autor, Editor |
| `3-Domain/Cadastro.Domain/Interfaces/ITitularidadeRepository.cs` | Interface | CRUD + ExisteDuplicataAsync + CalcularSomaAsync |
| **Application — Commands** | | |
| `2-Application/.../Titularidades/Commands/AdicionarTitularidadeCommand.cs` | Command + Handler + Validator | Adiciona vínculo; valida Editor=PJ, duplicata, status obra |
| `2-Application/.../Titularidades/Commands/EditarTitularidadeCommand.cs` | Command + Handler + Validator | Edita percentual; valida status obra |
| `2-Application/.../Titularidades/Commands/RemoverTitularidadeCommand.cs` | Command + Handler | Remove vínculo; valida status obra |
| **Application — Queries** | | |
| `2-Application/.../Titularidades/Queries/ListarTitularidadesQuery.cs` | Query + Handler | Lista titularidades da obra + soma |
| `2-Application/.../Titularidades/Queries/BuscarTitularesQuery.cs` | Query + Handler | Autocomplete por nome/documento |
| **Application — Responses** | | |
| `2-Application/.../Titularidades/Responses/TitularidadesResponse.cs` | DTO | Lista + somaPercentual + somaCompleta |
| `2-Application/.../Titularidades/Responses/TitularidadeItemResponse.cs` | DTO | Item com titular resumido |
| `2-Application/.../Titularidades/Responses/TitularResumoResponse.cs` | DTO | Autocomplete: nome, tipo, documento, associacaoSigla |
| **Infra** | | |
| `4-Infra/.../Data/Configurations/TitularidadeAutoralConfiguration.cs` | Config EF | Fluent API, FKs, unique, CHECK |
| `4-Infra/.../Data/Migrations/XXXX_AddTitularidadesAutorais.cs` | Migration | Tabela + índices |
| `4-Infra/.../Repositories/TitularidadeRepository.cs` | Repository | CRUD + soma + duplicata check |
| **API** | | |
| `1-Services/.../Endpoints/TitularidadeEndpoints.cs` | Endpoints | 4 endpoints sub-resource + 1 autocomplete |
| **Testes** | | |
| `5-Tests/.../Titularidades/TitularidadeAutoralTests.cs` | Teste | Entidade: Criar, AlterarPercentual, validações |
| `5-Tests/.../Titularidades/AdicionarTitularidadeHandlerTests.cs` | Teste | Happy path, Editor+PF, duplicata, obra LIBERADA |
| `5-Tests/.../Titularidades/EditarTitularidadeHandlerTests.cs` | Teste | Happy path, obra LIBERADA |
| `5-Tests/.../Titularidades/RemoverTitularidadeHandlerTests.cs` | Teste | Happy path, obra LIBERADA |
| `5-Tests/.../Titularidades/ListarTitularidadesHandlerTests.cs` | Teste | Lista + soma correta |
| `5-Tests/Cadastro.IntegrationTests/TitularidadeEndpointsTests.cs` | Teste integração | Todos os endpoints |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `4-Infra/.../Data/CadastroDbContext.cs` | Adicionar `DbSet<TitularidadeAutoral>`, ApplyConfiguration |
| `4-Infra/.../Repositories/ObraRepository.cs` | Atualizar `PossuiVinculosAsync` — verificar titularidades_autorais (não mais placeholder) |
| `4-Infra/.../Repositories/TitularRepository.cs` | Atualizar `PossuiVinculosAsync` — verificar titularidades_autorais |
| `2-Application/.../Obras/Commands/ObterIswcCommandHandler.cs` | Conectar titularidades reais: buscar autores + associação do titular com maior % |
| `1-Services/.../Program.cs` | Registrar ITitularidadeRepository, MapTitularidadeEndpoints() |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `3-Domain/Cadastro.Domain/Entities/ObraMusical.cs` | FK, status check |
| `3-Domain/Cadastro.Domain/Entities/Titular.cs` | FK, tipo PF/PJ check |
| `2-Application/.../Obras/Commands/ObterIswcCommandHandler.cs` | Integração ISWC |
| `tasks/prd-titularidades-autorais/api-contract.yaml` | Contrato |

---

## Análise de Impacto

| Componente | Tipo | Descrição |
|---|---|---|
| ObraRepository.PossuiVinculosAsync | Fix | Substituir placeholder `return false` por query real em titularidades_autorais |
| TitularRepository.PossuiVinculosAsync | Fix | Substituir placeholder por query real |
| ObterIswcCommandHandler | Extensão | Conectar dados reais de titulares (nomes + associação) em vez de placeholder |
| F05 (Fonogramas) futuro | Dependência | Fonogramas referenciam obra que agora tem titularidades; PossuiVinculosAsync será estendido |
| F06 (Conexos) futuro | Padrão | Participação Conexa seguirá mesmo padrão de junção com percentual |
| F07 (Status) futuro | Dependência | Verificação de soma=100% será usada para transição PENDENTE→LIBERADO |

---

## Abordagem de Testes

### Unitários

| Classe | Cenários |
|--------|----------|
| TitularidadeAutoralTests | Criar (ok), percentual 0 (rejeita), percentual > 100 (rejeita), AlterarPercentual (ok + inválido) |
| AdicionarTitularidadeHandlerTests | Happy path, Editor+PF (422), duplicata titular+categoria (409), obra LIBERADA (409 DEPURACAO), obra DEPURADA (422), titular não existe (404) |
| EditarTitularidadeHandlerTests | Happy path, obra LIBERADA (409), titularidade não existe (404) |
| RemoverTitularidadeHandlerTests | Happy path, obra LIBERADA (409) |
| ListarTitularidadesHandlerTests | Lista com soma correta, obra sem titularidades (soma 0), soma incompleta |
| BuscarTitularesHandlerTests | Busca por nome, busca por documento, sem resultados |

### Integração

| Cenário | Endpoint | Status |
|---------|----------|--------|
| Adicionar titularidade | POST /obras/{id}/titularidades | 201 com soma |
| Adicionar Editor PF | POST | 422 |
| Adicionar duplicata | POST | 409 |
| Adicionar em obra LIBERADA | POST | 409 DEPURACAO_NECESSARIA |
| Listar titularidades | GET /obras/{id}/titularidades | 200 com soma |
| Editar percentual | PUT /obras/{id}/titularidades/{tid} | 200 com soma |
| Remover titularidade | DELETE /obras/{id}/titularidades/{tid} | 200 com soma |
| Autocomplete | GET /titulares/busca?q=dj | 200 array |
| Verificar PossuiVinculos obra | DELETE /obras/{id} | 409 (tem titularidades) |
| Verificar PossuiVinculos titular | DELETE /titulares/{id} | 409 (tem titularidades) |

---

## Sequenciamento de Desenvolvimento

1. **Domain** — TitularidadeAutoral, CategoriaAutoral, ITitularidadeRepository
2. **Infra** — Configuration, Migration, TitularidadeRepository
3. **Infra Fix** — Atualizar PossuiVinculosAsync em ObraRepository e TitularRepository
4. **Application — Queries** — ListarTitularidades + BuscarTitulares + Responses
5. **Application — Commands** — Adicionar, Editar, Remover + Validators
6. **Application Fix** — Conectar ObterIswcCommandHandler com titularidades reais
7. **API** — TitularidadeEndpoints + Program.cs
8. **Testes unitários**
9. **Testes de integração**

---

## Mapeamento PRD → Implementação

| Requisito | Camada | Implementação |
|-----------|--------|---------------|
| RF-01 (adicionar titularidade) | Domain + Application | TitularidadeAutoral.Criar + AdicionarCommand |
| RF-03 (Editor exige PJ) | Application | Handler valida titular.Tipo == PJ para Editor |
| RF-05 (acúmulo papéis) | Domain | Unique constraint (obraId, titularId, categoria) — permite mesmo titular com categorias diferentes |
| RF-06 (duplicata proibida) | Infra | ExisteDuplicataAsync → ConflictException |
| RF-07 (soma exibida) | Application | TitularidadesResponse.somaPercentual calculada no handler |
| RF-08 (soma temporária != 100%) | Domain | Sem validação de soma no Cadastro — apenas indicador |
| RF-11 (arredondamento RN-12) | Domain | Math.Round(percentual, 4) no factory method |
| RF-12 (editar percentual) | Domain | AlterarPercentual() |
| RF-15 (remover) | Application | RemoverCommand |
| RF-21 (depuração LIBERADA) | Application | DepuracaoNecessariaException no handler |
| RF-25 (habilitar ISWC) | Application | ObterIswcHandler usa titularidades reais |
| RF-27 (associação maior %) | Application | OrderByDescending(percentual).ThenBy(criadoEm).First() |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar tech spec frontend ou tasks, use as skills correspondentes.*
