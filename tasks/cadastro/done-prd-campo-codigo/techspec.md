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

---

## Apêndice — Implementação Real no Backend (2026-05-19)

Este apêndice documenta o que foi encontrado implementado em `services/cadastro-api`. A especificação original acima permanece preservada como plano; os itens abaixo descrevem o estado efetivo do código.

### Banco de Dados e EF Core

| Item | Implementação real |
|------|--------------------|
| Migration | `4-Infra/Cadastro.Infra/Data/Migrations/20260403190454_AddCodigo_CampoCodigo.cs` |
| Sequences | `cadastro.seq_associacoes_codigo` começa em 8; `seq_titulares_codigo`, `seq_obras_codigo` e `seq_fonogramas_codigo` começam em 1. |
| Colunas | `Codigo bigint not null` em `cadastro.associacoes`, `cadastro.titulares`, `cadastro.obras_musicais` e `cadastro.fonogramas`, todas com `defaultValueSql: nextval(...)`. |
| Índices únicos | `uq_associacoes_codigo`, `uq_titulares_codigo`, `uq_obras_codigo`, `uq_fonogramas_codigo`. |
| Down migration | Remove índices, colunas e sequences criadas. |
| Model snapshot | `CadastroDbContextModelSnapshot.cs` reflete `Codigo`, defaults, índices únicos e seed das associações. |

Diferença em relação à spec planejada: para Associações, a migration não cria a sequence em 1 para depois executar `RESTART WITH 8`; ela já cria `seq_associacoes_codigo` com `START WITH 8`.

### Entidades e Configurations

Implementado:

| Entidade | Campo |
|----------|-------|
| `Associacao` | `public long Codigo { get; private set; }` |
| `Titular` | `public long Codigo { get; private set; }` |
| `ObraMusical` | `public long Codigo { get; private set; }` |
| `Fonograma` | `public long Codigo { get; private set; }` |

Configurations implementadas:

| Arquivo | Implementação |
|---------|---------------|
| `AssociacaoConfiguration.cs` | `HasDefaultValueSql("nextval('cadastro.seq_associacoes_codigo')")`, `ValueGeneratedOnAdd()`, índice único `uq_associacoes_codigo`, seed via `AssociacaoSeed.GetSeedData()`. |
| `TitularConfiguration.cs` | Default sequence, `ValueGeneratedOnAdd()` e índice único `uq_titulares_codigo`. |
| `ObraMusicalConfiguration.cs` | Default sequence, `ValueGeneratedOnAdd()` e índice único `uq_obras_codigo`. |
| `FonogramaConfiguration.cs` | Default sequence, `ValueGeneratedOnAdd()` e índice único `uq_fonogramas_codigo`. |

Seed real:

- `AssociacaoSeed.GetSeedData()` retorna objetos anônimos com `Codigo = 1L` a `7L`.
- A entidade `Associacao` não expõe setter público; o seed usa `HasData` com objeto anônimo.

### Responses e Mapeamentos

Implementado com `Codigo`:

| Response | Observação |
|----------|------------|
| `AssociacaoResponse` | Inclui `Id`, `Codigo`, `Sigla`, `Nome`, `Cnpj`. |
| `TitularResponse` | Inclui `Codigo` e `AssociacaoResumoResponse` também inclui `Codigo`. |
| `ObraResponse` | Inclui `Codigo`. |
| `FonogramaResponse` | Inclui `Codigo`; `ObraResumoResponse` também inclui `Codigo`. |
| `TitularResumoResponse` | Inclui `Codigo`, usado em titularidades e participações. |
| `FonogramaResumoResponse` | Inclui `Codigo`, usado em listagens resumidas/por obra. |
| `DepuracaoResponse` | Retorna `ObraDepurada` e `NovaObra` como `ObraResponse`, portanto ambas com `Codigo`. |
| `DepuracaoFonogramaResponse` | Retorna `FonogramaDepurado` e `NovoFonograma` como `FonogramaResponse`, portanto ambos com `Codigo`. |

Os handlers de status e escrita também retornam responses com `Codigo` quando mapeiam `ObraResponse` ou `FonogramaResponse`.

### Filtros e Endpoints

Implementado:

| Entidade | Query/filter | Repositório |
|----------|--------------|-------------|
| Titular | `ListarTitularesQuery(long? Codigo)`, endpoint aceita `[FromQuery] long? codigo` | `TitularRepository.ListarAsync` aplica `t.Codigo == filtro.Codigo.Value`. |
| Obra | `ListarObrasQuery(long? Codigo)` via `[AsParameters]` | `ObraRepository.ListarAsync` aplica `o.Codigo == filtro.Codigo.Value`. |
| Fonograma | `ListarFonogramasQuery(long? Codigo)` via `[AsParameters]` | `FonogramaRepository.ListarAsync` aplica `f.Codigo == filtro.Codigo.Value`. |

Não há endpoint de busca por `codigo` para Associações; elas são listadas com seus códigos e buscadas por UUID no detalhe.

### Ordenação

Estado real:

- `sort=codigo` e `sort=-codigo` não são tratados nos repositórios.
- `TitularRepository` aceita `nome`, `associacao`, `status` e descendentes via prefixo `-`; fallback: `Nome`.
- `ObraRepository` aceita `titulo`, `iswc`, `status`, `tipo`, `atualizadoem` e descendentes; fallback: `Titulo`.
- `FonogramaRepository` normaliza `campo,direção` para `campo_direção` e aceita `isrc`, `obra`, `status`, `pais`; fallback: `Isrc`.
- Defaults continuam `nome`, `titulo` e `isrc`; código DESC como default não foi implementado.

### Depuração

Obras:

- `DepurarObraCommandHandler` busca a obra original, exige status `Liberado`, cria `novaObra` via `ObraMusical.Criar`, marca a original com `obraOriginal.Depurar(novaObra.Id)`, copia titularidades autorais, registra evento de outbox e retorna `DepuracaoResponse`.
- O código da obra original permanece o mesmo; o código da nova obra vem da sequence ao salvar.

Fonogramas:

- `DepurarFonogramaCommandHandler` busca o fonograma original, exige status `Liberado`, valida unicidade do novo ISRC, cria `novoFonograma` via `Fonograma.Criar`, marca o original com `original.Depurar(novoFonograma.Id)`, registra evento de outbox e retorna `DepuracaoFonogramaResponse`.
- O código do fonograma original permanece o mesmo; o código do novo fonograma vem da sequence ao salvar.

### Auditoria e Eventos

Implementação observada além da spec original:

- `TitularAuditEventFactory`, `ObraAuditEventFactory` e `FonogramaAuditEventFactory` incluem `codigo` nos mapas de auditoria.
- Os eventos de outbox de criação/depuração continuam usando UUIDs como `subject` e IDs de relação; os payloads de outbox de domínio não usam `codigo` como chave.
- Em fluxos de criação, os eventos de auditoria são montados antes de `SaveChangesAsync`; portanto, se o evento for serializado antes do EF preencher o valor gerado pelo banco, o `codigo` no snapshot de criação pode refletir o valor CLR inicial até a entidade ser recarregada. Os responses HTTP recarregados/mapeados após o save retornam o código corretamente.

### Testes Encontrados

Arquivo específico: `5-Tests/Cadastro.IntegrationTests/CodigoIntegrationTests.cs`.

Coberto:

- `POST /titulares` retorna código maior que zero.
- Segundo titular recebe código maior que o primeiro.
- `GET /titulares?codigo={codigo}` retorna exatamente o titular esperado.
- `GET /titulares?codigo=999999` retorna lista vazia.
- `PUT /titulares/{id}` mantém o mesmo código.
- Depuração de obra mantém o código original na obra depurada e gera código maior na nova obra.

Não encontrado como teste dedicado:

- Seed de Associações com códigos 1 a 7.
- Código em criação, edição e depuração de Fonograma.
- Filtro por código em Obras e Fonogramas.
- Ordenação por código.
- Garantia de que requests com campo `codigo` são ignorados explicitamente.

---

## Apêndice — Revalidação Backend do Código Atual (2026-05-20)

Esta seção foi adicionada após nova leitura do código atual em `services/cadastro-api`. Ela complementa, sem reescrever, a tech spec e o apêndice anterior.

### Pontos confirmados

| Área | Estado atual |
|------|--------------|
| Entidades, EF e migration | O estado descrito no apêndice anterior permanece válido: `Codigo` existe nas 4 entidades, com defaults por sequence e índices únicos. |
| Listagens por código | `TitularRepository`, `ObraRepository` e `FonogramaRepository` aplicam `Where(... Codigo == filtro.Codigo.Value)` antes da contagem e paginação. |
| Responses de Fonograma | `ListarFonogramasHandler`, `GetFonogramaByIdQuery`, comandos de escrita/status e `ListarFonogramasPorObraQuery` continuam incluindo `Codigo`; `ObraResumoResponse` também inclui código da obra. |
| Depuração de Fonograma | `DepuracaoFonogramaResponse` é aninhado: `FonogramaResponse FonogramaDepurado` e `FonogramaResponse NovoFonograma`. O endpoint retorna `201 Created` com location `/api/v1/fonogramas/{result.NovoFonograma.Id}`. |

### Pendências técnicas revalidadas

| Item | Detalhe |
|------|---------|
| Ordenação por código | `TitularRepository` não trata `codigo`/`-codigo`; `ObraRepository` não trata `codigo`/`-codigo`; `FonogramaRepository` normaliza apenas formato `campo,direção` para `campo_direção` e não trata `codigo`, `codigo_desc` ou `-codigo`. |
| Defaults de ordenação | `ListarTitularesQuery` segue com `Sort = "nome"`, `ListarObrasQuery` com `Sort = "titulo"` e `ListarFonogramasQuery` com `Sort = "isrc"`. |
| Busca geral | `BuscaCadastroQueryHandler` e `ResultadoBuscaDto` não carregam `Codigo` e os métodos `BuscarAsync` de Obras/Fonogramas não pesquisam pelo código de negócio. |
| Cobertura de teste | Não foi encontrado teste novo além de `CodigoIntegrationTests.cs`; continuam sem cobertura dedicada os cenários de código em Fonograma, filtros por código em Obras/Fonogramas, seed 1-7 de Associações e ordenação por código. |

### Contrato backend que deve orientar o frontend

- Para depuração de obra, o contrato permanece `DepuracaoResponse(ObraDepurada, NovaObra)`.
- Para depuração de fonograma, o contrato real é `DepuracaoFonogramaResponse(FonogramaDepurado, NovoFonograma)`.
- Consumidores frontend devem ler o UUID da nova entidade em `response.novoFonograma.id` quando o JSON estiver serializado em camelCase, não em `response.novoFonogramaId`.
