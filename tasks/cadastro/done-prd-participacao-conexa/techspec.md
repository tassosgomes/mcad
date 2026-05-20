# Tech Spec — F06: Participação Conexa Automática

> **PRD:** `tasks/prd-participacao-conexa/prd.md`
> **API Contract:** `tasks/prd-participacao-conexa/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F06
> **Data:** 2026-04-01

---

## Resumo Executivo

Esta Tech Spec cobre a implementação das Participações Conexas — a feature mais rica em lógica de domínio do Cadastro. Introduz o **algoritmo de cálculo automático de percentuais** conforme o Regulamento de Distribuição (43,7/41,7/14,6 ou 50/50), com arredondamento RN-12, ajuste manual limitado (intérpretes/produtores) e flag `percentuaisDesatualizados`. Segue o padrão de junção de F04 (Titularidades) e conecta a depuração de F05 (Fonogramas).

A lógica de cálculo é implementada como **Domain Service** (`CalculadoraConexos`) no Domain Layer — isolada, testável, sem dependências externas.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `dotnet-architecture` | Domain Service, entidade de junção, CQRS |
| `dotnet-code-quality` | FluentValidation, algoritmo de arredondamento |
| `dotnet-testing` | xUnit AAA — cenários de cálculo paramétricos |
| `common/restful-api` | Sub-resources, ProblemDetails |

---

## Arquitetura do Sistema

### Visão Geral

```
services/cadastro-api/
├── 3-Domain/Cadastro.Domain/
│   ├── Entities/ParticipacaoConexa.cs        ← Junção fonograma↔titular
│   ├── Enums/CategoriaConexo.cs              ← Interprete, ProdutorFonografico, MusicoExecutante
│   ├── Services/CalculadoraConexos.cs        ← Domain Service: algoritmo de cálculo
│   └── Interfaces/IParticipacaoRepository.cs
├── 4-Infra/Cadastro.Infra/
│   ├── Data/Configurations/ParticipacaoConexaConfiguration.cs
│   ├── Data/Migrations/XXXX_AddParticipacoesConexas.cs
│   └── Repositories/ParticipacaoRepository.cs
├── 2-Application/Cadastro.Application/
│   └── Participacoes/
│       ├── Commands/ (Adicionar, AjustarPercentual, Remover, Calcular)
│       ├── Queries/ (Listar)
│       └── Responses/
└── 1-Services/Cadastro.API/
    └── Endpoints/ParticipacaoEndpoints.cs    ← 5 endpoints sub-resource
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| `CalculadoraConexos` como Domain Service (não handler) | Lógica pura de domínio sem dependências externas; reutilizável e testável isoladamente |
| Percentual nullable na entidade | `null` = não calculado; `0` seria ambíguo |
| Flag `PercentuaisDesatualizados` na entidade Fonograma | Estado derivado persistido — evita recalcular a cada GET |
| Músico não editável (reject 422, não silêncio) | Explícito > implícito — frontend sabe exatamente o que aconteceu |
| Cálculo no POST /calcular (não automático ao adicionar) | Permite montar composição completa antes de calcular; recálculo é explícito com alerta |

---

## Design de Implementação

### Entidade ParticipacaoConexa (Domain)

```csharp
public class ParticipacaoConexa
{
    public Guid Id { get; private set; }
    public Guid FonogramaId { get; private set; }
    public Guid TitularId { get; private set; }
    public CategoriaConexo Categoria { get; private set; }
    public decimal? Percentual { get; private set; }  // null = não calculado
    public DateTime CriadoEm { get; private set; }

    // Navigation
    public Fonograma Fonograma { get; private set; }
    public Titular Titular { get; private set; }

    private ParticipacaoConexa() { }

    public static ParticipacaoConexa Criar(Guid fonogramaId, Guid titularId, CategoriaConexo categoria)
    {
        return new ParticipacaoConexa
        {
            Id = Guid.NewGuid(),
            FonogramaId = fonogramaId,
            TitularId = titularId,
            Categoria = categoria,
            Percentual = null, // aguardando cálculo
            CriadoEm = DateTime.UtcNow,
        };
    }

    public void DefinirPercentual(decimal percentual)
    {
        if (percentual <= 0 || percentual > 100)
            throw new DomainException("Percentual deve estar entre 0.0001 e 100.0000");
        Percentual = Math.Round(percentual, 4);
    }

    public void AjustarPercentualManual(decimal percentual)
    {
        if (Categoria == CategoriaConexo.MusicoExecutante)
            throw new DomainException("Percentual de Músico Executante não pode ser editado manualmente");
        DefinirPercentual(percentual);
    }

    public bool Editavel => Categoria != CategoriaConexo.MusicoExecutante;
}

public enum CategoriaConexo
{
    Interprete,
    ProdutorFonografico,
    MusicoExecutante
}
```

### Domain Service — CalculadoraConexos

```csharp
// 3-Domain/Cadastro.Domain/Services/CalculadoraConexos.cs
public static class CalculadoraConexos
{
    private const decimal FatiaInterpreteCom = 43.7m;
    private const decimal FatiaProdutorCom = 41.7m;
    private const decimal FatiaMusicoCom = 14.6m;
    private const decimal FatiaInterpreteSem = 50.0m;
    private const decimal FatiaProdutorSem = 50.0m;

    public static void Calcular(IList<ParticipacaoConexa> participacoes)
    {
        var interpretes = participacoes.Where(p => p.Categoria == CategoriaConexo.Interprete).ToList();
        var produtores = participacoes.Where(p => p.Categoria == CategoriaConexo.ProdutorFonografico).ToList();
        var musicos = participacoes.Where(p => p.Categoria == CategoriaConexo.MusicoExecutante).ToList();

        if (!interpretes.Any())
            throw new DomainException("Fonograma deve ter ao menos 1 Intérprete");
        if (!produtores.Any())
            throw new DomainException("Fonograma deve ter ao menos 1 Produtor Fonográfico");

        bool temMusicos = musicos.Any();

        decimal fatiaInterprete = temMusicos ? FatiaInterpreteCom : FatiaInterpreteSem;
        decimal fatiaProdutor = temMusicos ? FatiaProdutorCom : FatiaProdutorSem;

        // Distribuir igualitariamente dentro de cada fatia
        DistribuirIgualitario(interpretes, fatiaInterprete);
        DistribuirIgualitario(produtores, fatiaProdutor);

        if (temMusicos)
            DistribuirIgualitario(musicos, FatiaMusicoCom);
    }

    private static void DistribuirIgualitario(IList<ParticipacaoConexa> grupo, decimal fatiaTotal)
    {
        int n = grupo.Count;
        decimal porParticipante = Math.Truncate(fatiaTotal / n * 10000m) / 10000m; // truncar 4 casas

        // Atribuir truncado a todos
        foreach (var p in grupo)
            p.DefinirPercentual(porParticipante);

        // Calcular diferença e atribuir ao primeiro (RN-12)
        decimal somaAtribuida = porParticipante * n;
        decimal diferenca = Math.Round(fatiaTotal - somaAtribuida, 4);

        if (diferenca != 0 && grupo.Any())
            grupo[0].DefinirPercentual(porParticipante + diferenca);
    }
}
```

### Flag PercentuaisDesatualizados

Adicionar property à entidade `Fonograma`:

```csharp
// Adição na entidade Fonograma (F05)
public bool PercentuaisDesatualizados { get; private set; }

public void MarcarPercentuaisDesatualizados()
{
    PercentuaisDesatualizados = true;
    AtualizadoEm = DateTime.UtcNow;
}

public void MarcarPercentuaisAtualizados()
{
    PercentuaisDesatualizados = false;
    AtualizadoEm = DateTime.UtcNow;
}
```

### Interface IParticipacaoRepository

```csharp
public interface IParticipacaoRepository
{
    Task<IEnumerable<ParticipacaoConexa>> GetByFonogramaIdAsync(Guid fonogramaId, CancellationToken ct);
    Task<ParticipacaoConexa?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<bool> ExisteDuplicataAsync(Guid fonogramaId, Guid titularId, CategoriaConexo categoria, CancellationToken ct);
    Task<ParticipacaoConexa> AddAsync(ParticipacaoConexa participacao, CancellationToken ct);
    void Delete(ParticipacaoConexa participacao);
    Task SaveChangesAsync(CancellationToken ct);
}
```

### Schema PostgreSQL

```sql
CREATE TABLE cadastro.participacoes_conexas (
    "Id"            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    "FonogramaId"   UUID          NOT NULL REFERENCES cadastro.fonogramas("Id"),
    "TitularId"     UUID          NOT NULL REFERENCES cadastro.titulares("Id"),
    "Categoria"     VARCHAR(25)   NOT NULL,
    "Percentual"    DECIMAL(8,4)  NULL,  -- null = não calculado
    "CriadoEm"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_participacoes_categoria CHECK ("Categoria" IN ('INTERPRETE', 'PRODUTOR_FONOGRAFICO', 'MUSICO_EXECUTANTE')),
    CONSTRAINT ck_participacoes_percentual CHECK ("Percentual" IS NULL OR ("Percentual" > 0 AND "Percentual" <= 100)),
    CONSTRAINT uq_participacoes_fono_titular_cat UNIQUE ("FonogramaId", "TitularId", "Categoria")
);

CREATE INDEX ix_participacoes_fonograma ON cadastro.participacoes_conexas ("FonogramaId");
CREATE INDEX ix_participacoes_titular ON cadastro.participacoes_conexas ("TitularId");
```

Adicionar coluna ao fonogramas:
```sql
ALTER TABLE cadastro.fonogramas ADD COLUMN "PercentuaisDesatualizados" BOOLEAN NOT NULL DEFAULT FALSE;
```

### Commands

#### CalcularPercentuaisCommand (mais complexo)

```csharp
public record CalcularPercentuaisCommand(Guid FonogramaId) : ICommand<ParticipacoesResponse>;

public class CalcularPercentuaisCommandHandler : ICommandHandler<CalcularPercentuaisCommand, ParticipacoesResponse>
{
    public async Task<ParticipacoesResponse> HandleAsync(CalcularPercentuaisCommand cmd, CancellationToken ct)
    {
        var fonograma = await _fonogramaRepo.GetByIdAsync(cmd.FonogramaId, ct)
            ?? throw new NotFoundException(nameof(Fonograma), cmd.FonogramaId);

        if (fonograma.Status == StatusFonograma.Depurado)
            throw new DomainException("Fonogramas depurados não podem ser alterados");
        if (fonograma.Status == StatusFonograma.Liberado)
            throw new DepuracaoNecessariaException("Recalcular participações de fonograma LIBERADO requer depuração");

        var participacoes = (await _participacaoRepo.GetByFonogramaIdAsync(cmd.FonogramaId, ct)).ToList();

        // Domain Service calcula
        CalculadoraConexos.Calcular(participacoes);

        fonograma.MarcarPercentuaisAtualizados();
        await _participacaoRepo.SaveChangesAsync(ct);

        return MapToResponse(fonograma, participacoes);
    }
}
```

#### AdicionarParticipacaoCommand

```csharp
// Handler: verifica status fonograma (LIBERADO → depuração), verifica duplicata,
// cria entidade SEM percentual, marca PercentuaisDesatualizados se já tinha cálculo,
// retorna ParticipacoesResponse
```

#### AjustarPercentualCommand

```csharp
// Handler: verifica status (LIBERADO → depuração), busca participação,
// chama AjustarPercentualManual (rejeita músico), save, retorna ParticipacoesResponse
```

### Impacto no FonogramaRepository.PossuiVinculosAsync

Não necessário aqui — fonogramas não verificam participações para exclusão (verificam apenas status `PodeSerExcluido`). Mas `TitularRepository.PossuiVinculosAsync` deve ser estendido:

```csharp
// TitularRepository — adicionar verificação de participações conexas
return await _context.TitularidadesAutorais.AnyAsync(t => t.TitularId == titularId, ct)
    || await _context.ParticipacoesConexas.AnyAsync(p => p.TitularId == titularId, ct);
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Domain** | | |
| `3-Domain/.../Entities/ParticipacaoConexa.cs` | Entidade | Junção fono↔titular, Percentual nullable, Editavel, AjustarPercentualManual |
| `3-Domain/.../Enums/CategoriaConexo.cs` | Enum | Interprete, ProdutorFonografico, MusicoExecutante |
| `3-Domain/.../Services/CalculadoraConexos.cs` | Domain Service | Algoritmo 43,7/41,7/14,6 ou 50/50, arredondamento RN-12 |
| `3-Domain/.../Interfaces/IParticipacaoRepository.cs` | Interface | CRUD + ExisteDuplicata |
| **Application — Commands** | | |
| `2-Application/.../Participacoes/Commands/AdicionarParticipacaoCommand.cs` | Cmd+Handler+Validator | Adiciona sem percentual, marca desatualizado |
| `2-Application/.../Participacoes/Commands/AjustarPercentualCommand.cs` | Cmd+Handler+Validator | Ajuste manual, rejeita músico |
| `2-Application/.../Participacoes/Commands/RemoverParticipacaoCommand.cs` | Cmd+Handler | Remove, marca desatualizado |
| `2-Application/.../Participacoes/Commands/CalcularPercentuaisCommand.cs` | Cmd+Handler | Invoca CalculadoraConexos, marca atualizado |
| **Application — Queries** | | |
| `2-Application/.../Participacoes/Queries/ListarParticipacoesQuery.cs` | Query+Handler | Lista com titular Include, soma, flags |
| **Application — Responses** | | |
| `2-Application/.../Participacoes/Responses/ParticipacoesResponse.cs` | DTO | Lista + soma + somaCalculada + percentuaisDesatualizados |
| `2-Application/.../Participacoes/Responses/ParticipacaoItemResponse.cs` | DTO | Com titular, categoria, percentual, editavel |
| **Infra** | | |
| `4-Infra/.../Data/Configurations/ParticipacaoConexaConfiguration.cs` | Config EF | Fluent API, FKs, unique, CHECK, nullable Percentual |
| `4-Infra/.../Data/Migrations/XXXX_AddParticipacoesConexas.cs` | Migration | Tabela + coluna PercentuaisDesatualizados em fonogramas |
| `4-Infra/.../Repositories/ParticipacaoRepository.cs` | Repository | CRUD + ExisteDuplicata |
| **API** | | |
| `1-Services/.../Endpoints/ParticipacaoEndpoints.cs` | Endpoints | 5 endpoints sub-resource |
| **Testes** | | |
| `5-Tests/.../Participacoes/ParticipacaoConexaTests.cs` | Teste | Entidade: Criar, DefinirPercentual, AjustarManual, Editavel |
| `5-Tests/.../Participacoes/CalculadoraConexosTests.cs` | Teste | Domain Service: com/sem músico, dueto, arredondamento, sem intérprete/produtor |
| `5-Tests/.../Participacoes/AdicionarParticipacaoHandlerTests.cs` | Teste | Happy path, duplicata, fonograma LIBERADO |
| `5-Tests/.../Participacoes/AjustarPercentualHandlerTests.cs` | Teste | Intérprete ok, músico rejeita, LIBERADO |
| `5-Tests/.../Participacoes/CalcularPercentuaisHandlerTests.cs` | Teste | Happy path, composição incompleta, LIBERADO |
| `5-Tests/.../Participacoes/RemoverParticipacaoHandlerTests.cs` | Teste | Ok, LIBERADO |
| `5-Tests/Cadastro.IntegrationTests/ParticipacaoEndpointsTests.cs` | Teste integração | Todos os endpoints |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `4-Infra/.../Data/CadastroDbContext.cs` | Adicionar `DbSet<ParticipacaoConexa>`, ApplyConfiguration |
| `3-Domain/.../Entities/Fonograma.cs` | Adicionar property `PercentuaisDesatualizados` + métodos MarcarDesatualizados/Atualizados |
| `4-Infra/.../Repositories/TitularRepository.cs` | PossuiVinculosAsync: adicionar `|| AnyAsync participacoes_conexas` |
| `1-Services/.../Program.cs` | Registrar IParticipacaoRepository, MapParticipacaoEndpoints() |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `3-Domain/.../Entities/TitularidadeAutoral.cs` | Padrão de junção com percentual |
| `2-Application/.../Titularidades/` | Padrão de commands/responses |
| `docs/regra-distribuicao.md` | Percentuais oficiais 43,7/41,7/14,6 |
| `docs/modelagem-titular.md` | Cenários one-man-band e coletivo |
| `tasks/prd-participacao-conexa/api-contract.yaml` | Contrato |

---

## Análise de Impacto

| Componente | Tipo | Descrição |
|---|---|---|
| Fonograma entidade | Extensão | +PercentuaisDesatualizados property + métodos |
| TitularRepository.PossuiVinculosAsync | Extensão | +verificação participacoes_conexas |
| F07 (Status) futuro | Dependência | LIBERADO requer somaCalculada + soma=100% |
| D04 (Distribuição) futuro | Dependência | Distribuição consome participações conexas para calcular créditos |

---

## Abordagem de Testes

### Unitários — CalculadoraConexos (CRÍTICO)

| Cenário | Input | Expected |
|---------|-------|----------|
| Padrão com músico | 1 intérprete, 1 produtor, 1 músico | 43.7, 41.7, 14.6 |
| Sem músico | 1 intérprete, 1 produtor | 50.0, 50.0 |
| Dueto | 2 intérpretes, 1 produtor, 2 músicos | 21.85+21.85, 41.7, 7.3+7.3 |
| One-man-band | 1 titular (intérprete+produtor+músico = 3 participações) | 43.7, 41.7, 14.6 |
| 3 músicos arredondamento | 1 int, 1 prod, 3 músicos | 43.7, 41.7, 4.8668+4.8666+4.8666 |
| 4 músicos | 1 int, 1 prod, 4 músicos | 43.7, 41.7, 3.65×4 |
| Sem intérprete | 0 intérpretes | DomainException |
| Sem produtor | 0 produtores | DomainException |
| 3 intérpretes | 3 int, 1 prod, 0 musc | 16.6667+16.6667+16.6666, 50.0 |

### Integração

| Cenário | Endpoint | Status |
|---------|----------|--------|
| Adicionar participante | POST /participacoes | 201 (sem %) |
| Duplicata | POST | 409 |
| Fonograma LIBERADO | POST | 409 DEPURACAO |
| Calcular padrão | POST /calcular | 200 soma=100% |
| Calcular sem intérprete | POST /calcular | 422 |
| Ajustar intérprete | PUT /participacoes/{pid} | 200 |
| Ajustar músico | PUT | 422 |
| Remover | DELETE | 200 desatualizado |
| Excluir titular com conexos | DELETE /titulares/{id} | 409 |

---

## Sequenciamento de Desenvolvimento

1. **Domain** — ParticipacaoConexa, CategoriaConexo, IParticipacaoRepository
2. **Domain** — CalculadoraConexos (Domain Service) — testável isoladamente
3. **Domain Fix** — Fonograma + PercentuaisDesatualizados
4. **Infra** — Configuration, Migration, ParticipacaoRepository
5. **Infra Fix** — TitularRepository.PossuiVinculosAsync + conexos
6. **Application — Queries** — ListarParticipacoes + Responses
7. **Application — Commands** — Adicionar, AjustarPercentual, Remover, Calcular
8. **API** — ParticipacaoEndpoints + Program.cs
9. **Testes unitários** — CalculadoraConexos (paramétrico) + Entidade + Handlers
10. **Testes integração**

---

## Mapeamento PRD → Implementação

| Requisito | Camada | Implementação |
|-----------|--------|---------------|
| RF-01 (adicionar) | Domain + Application | ParticipacaoConexa.Criar (sem %) + AdicionarCommand |
| RF-03 (duplicata) | Infra | ExisteDuplicataAsync → ConflictException |
| RF-04 (sem % ao adicionar) | Domain | Percentual = null no factory |
| RF-05 (desatualizado) | Domain | Fonograma.MarcarPercentuaisDesatualizados() |
| RF-08 (recálculo alerta) | Frontend | Alerta antes de chamar POST /calcular |
| RF-10/11 (com/sem músico) | Domain | CalculadoraConexos constantes 43,7/41,7/14,6 vs 50/50 |
| RF-12/13/14 (múltiplos) | Domain | DistribuirIgualitario() |
| RF-15 (arredondamento) | Domain | Truncar 4 casas + diferença no primeiro |
| RF-17/18 (ajuste manual) | Domain | AjustarPercentualManual() |
| RF-19 (músico não editável) | Domain | AjustarPercentualManual → DomainException |
| RF-26 (depuração LIBERADO) | Application | DepuracaoNecessariaException |

---

*Tech Spec gerada. Para tech spec frontend ou tasks, use as skills correspondentes.*

---

## Atualização Pós-Análise de Código

> Anexo acrescentado após análise da implementação. O conteúdo original acima foi preservado sem alteração.

### Inventário Implementado Observado

| Camada | Artefatos observados |
|--------|----------------------|
| Domain | `ParticipacaoConexa`, `CategoriaConexo`, `CalculadoraConexos`, `IParticipacaoRepository`, extensão de `Fonograma.PercentuaisDesatualizados` |
| Application | Commands/handlers de adicionar, ajustar, remover e calcular; query `ListarParticipacoesQueryHandler`; DTOs `ParticipacoesResponse` e `ParticipacaoItemResponse` |
| Infra | `ParticipacaoConexaConfiguration`, `ParticipacaoRepository`, migration `20260401131139_AddParticipacoesConexas`, `DbSet<ParticipacaoConexa>` e bloqueio de exclusão de titular com participação conexa |
| API | `ParticipacaoEndpoints` mapeado no `Program.cs` com cinco rotas sob `/api/v1/fonogramas/{fonogramaId}/participacoes` |
| Authz | Permissões `cadastro:default:participacao:listar`, `adicionar`, `ajustar`, `remover` e `calcular` |
| Auditoria | `ParticipacaoAuditEventFactory`, `IParticipacaoAuditPublisher` e eventos para add/adjust/remove/calculate |
| Frontend | Feature `features/cadastro/participacoes` com API client, hooks React Query, formulário, tabela, botão de cálculo, badge de desatualização e modal de recálculo |
| Integrações | `LiberarFonogramaCommandHandler` valida conexos antes da liberação; `ObterOwnershipSnapshotQueryHandler` expõe participações para Distribuição |
| Testes | Unit tests de cálculo/entidade/handlers e integration tests em `Cadastro.IntegrationTests/ParticipacaoEndpointsTests.cs` |

### Endpoints e Contratos Implementados

| Método | Rota | Handler | Observação |
|--------|------|---------|------------|
| GET | `/api/v1/fonogramas/{fonogramaId}/participacoes` | `ListarParticipacoesQueryHandler` | Retorna lista, soma nullable, `somaCalculada` e `percentuaisDesatualizados` |
| POST | `/api/v1/fonogramas/{fonogramaId}/participacoes` | `AdicionarParticipacaoCommandHandler` | Cria participação com percentual nulo; rejeita duplicata titular + categoria |
| PUT | `/api/v1/fonogramas/{fonogramaId}/participacoes/{id}` | `AjustarPercentualCommandHandler` | Ajusta percentual individual; músico executante é rejeitado pelo domínio |
| DELETE | `/api/v1/fonogramas/{fonogramaId}/participacoes/{id}` | `RemoverParticipacaoCommandHandler` | Remove participação e marca percentuais desatualizados quando havia cálculo |
| POST | `/api/v1/fonogramas/{fonogramaId}/participacoes/calcular` | `CalcularPercentuaisCommandHandler` | Executa `CalculadoraConexos`, marca percentuais atualizados e transiciona para `PENDENTE_DOCUMENTACAO` |

### Detalhes Técnicos Confirmados

| Tema | Implementação atual |
|------|---------------------|
| Categoria | Conversão EF grava `INTERPRETE`, `PRODUTOR_FONOGRAFICO` e `MUSICO_EXECUTANTE` em `VARCHAR(25)` |
| Precisão | `Percentual` é nullable e configurado como `DECIMAL(8,4)` |
| Ordenação da listagem | Repositório ordena participações calculadas primeiro, depois percentual descendente e nome do titular |
| Busca de titulares | Frontend reutiliza `/titulares/busca?q=...&limit=...` no autocomplete |
| Read-only | UI bloqueia escrita quando usuário não tem permissão ou fonograma está `DEPURADO` |
| LIBERADO | Handlers de add/adjust/remove/calculate lançam `DepuracaoNecessariaException` |
| DEPURADO | Handlers lançam `DomainException("Fonogramas depurados não podem ser alterados")` |
| Recálculo | Confirmação fica no frontend; backend sempre recalcula quando o endpoint é chamado |
| Liberação | `ValidadorLiberacaoFonograma` exige soma conexa exatamente `100.0000m` |
| Distribuição | `GetByFonogramaIdsAsync` busca participações com titular e associação para montar snapshot de ownership |

### Deltas em Relação à Tech Spec Original

| Ponto | Delta observado |
|-------|-----------------|
| Cópia na depuração | A spec previa novo fonograma com participações copiadas; QA e código indicam que o novo fonograma nasce sem participações |
| Status pós-cálculo | O cálculo também chama `fonograma.TransicionarParaPendenteDocumentacao()`, comportamento não detalhado na spec original |
| Status pós-remoção | Remover uma participação calculada chama `fonograma.RetornarParaPendenteValidacao()` quando marca desatualização |
| Validação RN-13 no PUT | `AjustarPercentualCommandHandler` não valida soma da fatia de intérpretes/produtores; a proteção efetiva antes de liberar é a soma total no `LiberarFonogramaCommandHandler` |
| Indicador por fatia | Frontend implementa `SomaIndicator` total e badge de desatualização; não foi identificado indicador específico por fatia |
| Auditoria | A implementação adicionou cobertura de auditoria para participação conexa, não prevista no inventário original |
| Authz | A implementação adicionou permissões granulares de participação, não previstas na primeira tech spec |
| Snapshot Distribuição | A implementação integrou participação conexa ao snapshot de ownership para consumo por Distribuição |

### Dívidas Técnicas e Riscos

| Risco | Evidência | Recomendação |
|-------|-----------|--------------|
| FK sombra `FonogramaId1` | A migration `20260403182402_SyncModel` adiciona coluna nullable `FonogramaId1` em `participacoes_conexas`; o snapshot mostra relacionamento adicional com `WithMany("ParticipacoesConexas")` | Ajustar `ParticipacaoConexaConfiguration` para usar `.WithMany(f => f.ParticipacoesConexas)` no relacionamento principal e gerar migration de correção |
| Navegação inversa não pareada | `Fonograma.ParticipacoesConexas` existe, mas a configuração atual usa `.WithMany()` no relacionamento de `ParticipacaoConexa.Fonograma` | Parear explicitamente a navegação para evitar modelo EF duplicado |
| RN-13 parcial | Backend aceita ajuste individual que pode deixar soma total ou fatia inválida até nova correção manual | Se RN-13 for obrigatório no momento do ajuste, implementar validação transacional por fatia no handler |
| Depuração sem cópia | Comportamento implementado diverge do RF-27 original | Decidir se o produto mantém o novo fluxo ou se deve copiar participações para o novo fonograma |

### Evidências de Teste e QA

| Fonte | Cobertura |
|-------|-----------|
| `CalculadoraConexosTests.cs` | Com músico, sem músico, dueto, três músicos, quatro músicos, três intérpretes, one-man-band e composições inválidas |
| `ParticipacaoEndpointsTests.cs` | Duplicata, cálculo completo, cálculo com músico, ajuste, rejeição de músico, remoção, bloqueio de exclusão de titular vinculado e titular com categorias diferentes |
| `qa-evidence/qa_report_consolidated.md` | 5/5 tasks PASS, 34/34 cenários PASS, incluindo composição, cálculo, ajuste, recálculo e depuração |

### Arquivos Relevantes para Manutenção

| Finalidade | Caminho |
|------------|---------|
| Entidade | `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/ParticipacaoConexa.cs` |
| Cálculo | `services/cadastro-api/3-Domain/Cadastro.Domain/Services/CalculadoraConexos.cs` |
| Configuração EF | `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/ParticipacaoConexaConfiguration.cs` |
| Repositório | `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/ParticipacaoRepository.cs` |
| Endpoints | `services/cadastro-api/1-Services/Cadastro.API/Endpoints/ParticipacaoEndpoints.cs` |
| Handlers | `services/cadastro-api/2-Application/Cadastro.Application/Participacoes/Commands/` |
| Query de listagem | `services/cadastro-api/2-Application/Cadastro.Application/Participacoes/Queries/ListarParticipacoesQueryHandler.cs` |
| UI principal | `frontend/src/features/cadastro/participacoes/components/ParticipacoesSection.tsx` |
| Tabela e inline edit | `frontend/src/features/cadastro/participacoes/components/ParticipacoesTable.tsx` |
| Integração Fonograma | `frontend/src/features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` |
