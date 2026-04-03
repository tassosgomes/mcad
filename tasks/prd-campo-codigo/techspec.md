# Tech Spec — Adição do Campo Código (Backend)

> **PRD:** `tasks/prd-campo-codigo/prd.md`
> **Tipo:** Feature Transversal
> **Data:** 2026-04-03

---

## Resumo Executivo

Feature de **modificação retroativa** em 4 entidades: adicionar property `Codigo` (long/BIGINT), sequence PostgreSQL por tabela, DEFAULT na coluna, read-only nas APIs. Impacto principal: 4 entidades, 4 configurations EF, 1 migration, 4 responses atualizados, 4 filtros adicionados, seed das associações com códigos 1-7.

## Design de Implementação

### Entidades — Adicionar Property

```csharp
// Em cada entidade (Associacao, Titular, ObraMusical, Fonograma):
public long Codigo { get; private set; }
// Gerado pelo banco (sequence) — nunca setado pelo código C#
```

### Sequences PostgreSQL

```sql
-- Uma sequence por tabela (BIGINT)
CREATE SEQUENCE cadastro.seq_associacoes_codigo AS BIGINT START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE cadastro.seq_titulares_codigo AS BIGINT START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE cadastro.seq_obras_codigo AS BIGINT START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE cadastro.seq_fonogramas_codigo AS BIGINT START WITH 1 INCREMENT BY 1;

-- Colunas com DEFAULT da sequence
ALTER TABLE cadastro.associacoes ADD COLUMN "Codigo" BIGINT NOT NULL UNIQUE
    DEFAULT nextval('cadastro.seq_associacoes_codigo');

ALTER TABLE cadastro.titulares ADD COLUMN "Codigo" BIGINT NOT NULL UNIQUE
    DEFAULT nextval('cadastro.seq_titulares_codigo');

ALTER TABLE cadastro.obras_musicais ADD COLUMN "Codigo" BIGINT NOT NULL UNIQUE
    DEFAULT nextval('cadastro.seq_obras_codigo');

ALTER TABLE cadastro.fonogramas ADD COLUMN "Codigo" BIGINT NOT NULL UNIQUE
    DEFAULT nextval('cadastro.seq_fonogramas_codigo');
```

### EF Core Configuration

```csharp
// Padrão para cada Configuration:
builder.Property(e => e.Codigo)
    .HasDefaultValueSql("nextval('cadastro.seq_{tabela}_codigo')")
    .ValueGeneratedOnAdd();

builder.HasIndex(e => e.Codigo)
    .IsUnique()
    .HasDatabaseName("uq_{tabela}_codigo");
```

### Seed Associações — Códigos 1-7

```csharp
// No AssociacaoSeed, adicionar Codigo a cada registro:
new Associacao(AbramusId, "Associação Brasileira de Música e Artes", "ABRAMUS", "50.997.063/0001-32") { Codigo = 1 },
// ... até Codigo = 7

// Ajustar sequence para continuar após o seed:
// ALTER SEQUENCE cadastro.seq_associacoes_codigo RESTART WITH 8;
```

> **Nota:** Como Associacao tem construtor privado para EF, o seed via `HasData` atribui o Codigo diretamente. A sequence é ajustada na migration para começar em 8.

### Responses — Adicionar Campo

```csharp
// Todos os responses ganham campo codigo:

// AssociacaoResponse
public record AssociacaoResponse(Guid Id, long Codigo, string Sigla, string Nome, string Cnpj);

// TitularResponse — adicionar Codigo após Id
// ObraResponse — adicionar Codigo após Id
// FonogramaResponse — adicionar Codigo após Id
// FonogramaResumoResponse — adicionar Codigo
// TitularResumoResponse (autocomplete) — adicionar Codigo
// AssociacaoResumoResponse (aninhada em titular) — adicionar Codigo
// TitularidadeItemResponse — titular resumo já terá Codigo
// ParticipacaoItemResponse — titular resumo já terá Codigo
```

### Filtro por Código

```csharp
// Nos repositórios de Titular, Obra, Fonograma — adicionar filtro:
if (filtro.Codigo.HasValue)
    query = query.Where(e => e.Codigo == filtro.Codigo.Value);
```

### Query Params nas APIs

```csharp
// Adicionar query param `codigo` nos endpoints de listagem:
// GET /api/v1/titulares?codigo=67494
// GET /api/v1/obras?codigo=1542
// GET /api/v1/fonogramas?codigo=5672
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `4-Infra/.../Data/Migrations/XXXX_AddCodigo.cs` | Migration | 4 sequences + 4 colunas + 4 unique indexes + restart sequence associações |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| **Entidades (4)** | |
| `3-Domain/.../Entities/Associacao.cs` | +`public long Codigo { get; private set; }` |
| `3-Domain/.../Entities/Titular.cs` | +`public long Codigo { get; private set; }` |
| `3-Domain/.../Entities/ObraMusical.cs` | +`public long Codigo { get; private set; }` |
| `3-Domain/.../Entities/Fonograma.cs` | +`public long Codigo { get; private set; }` |
| **Configurations (4)** | |
| `4-Infra/.../Configurations/AssociacaoConfiguration.cs` | +HasDefaultValueSql(nextval sequence) + unique index |
| `4-Infra/.../Configurations/TitularConfiguration.cs` | +idem |
| `4-Infra/.../Configurations/ObraMusicalConfiguration.cs` | +idem |
| `4-Infra/.../Configurations/FonogramaConfiguration.cs` | +idem |
| **Seed** | |
| `4-Infra/.../Data/Seeds/AssociacaoSeed.cs` | +Codigo 1-7 nos registros de seed |
| **Responses (8+)** | |
| `2-Application/.../Associacoes/Responses/AssociacaoResponse.cs` | +Codigo |
| `2-Application/.../Titulares/Responses/TitularResponse.cs` | +Codigo |
| `2-Application/.../Titulares/Responses/TitularListResponse.cs` | +Codigo (se diferente do TitularResponse) |
| `2-Application/.../Titularidades/Responses/TitularResumoResponse.cs` | +Codigo |
| `2-Application/.../Obras/Responses/ObraResponse.cs` | +Codigo |
| `2-Application/.../Fonogramas/Responses/FonogramaResponse.cs` | +Codigo |
| `2-Application/.../Fonogramas/Responses/FonogramaResumoResponse.cs` | +Codigo |
| **Handlers — Mapeamento (8+)** | |
| Todos os query handlers que mapeiam entidade → response | +Codigo no mapeamento |
| **Filtros (3)** | |
| `3-Domain/.../Interfaces/TitularFiltro.cs` | +long? Codigo |
| `3-Domain/.../Entities/ObraMusical.cs` (ObraFiltro) | +long? Codigo (ou onde o filtro estiver) |
| `3-Domain/.../Entities/Fonograma.cs` (FonogramaFiltro) | +long? Codigo |
| **Repositórios (3)** | |
| `4-Infra/.../Repositories/TitularRepository.cs` | +filtro por Codigo |
| `4-Infra/.../Repositories/ObraRepository.cs` | +filtro por Codigo |
| `4-Infra/.../Repositories/FonogramaRepository.cs` | +filtro por Codigo |
| **Endpoints (3)** | |
| `1-Services/.../Endpoints/TitularEndpoints.cs` | +query param `codigo` no GET listagem |
| `1-Services/.../Endpoints/ObraEndpoints.cs` | +query param `codigo` |
| `1-Services/.../Endpoints/FonogramaEndpoints.cs` | +query param `codigo` |

---

## Testes

### Unitários
- Verificar que Codigo é gerado (mock sequence retorna valor)
- Verificar que responses incluem Codigo

### Integração
- POST /titulares → response contém `codigo` (inteiro > 0)
- POST segundo titular → codigo incrementa
- GET /titulares?codigo=X → retorna exatamente 1 registro
- GET /associacoes → todas com codigo 1-7
- Depurar obra #1542 → nova obra tem codigo > 1542

---

*Tech Spec Backend gerada.*
