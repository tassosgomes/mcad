---
status: completed
parallelizable: false
blocked_by: ["4.0"]
---

<task_context>
<domain>arrecadacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 5.0: Queries, DTOs, Specification e testes unitarios

## Relacionada as User Stories
- [HU-06] Listar licencas com filtros (cobertura direta — ListarLicencasQueryHandler + LicencaSpecification)
- [HU-07] Buscar licenca por ID (cobertura direta — BuscarLicencaPorIdQueryHandler)
- [HU-08] Visualizar historico de status da licenca (cobertura direta — ListarHistoricoStatusLicencaQueryHandler)

## Visao Geral

Implementar as 3 queries, seus handlers e a `LicencaSpecification` com 5 filtros. O filtro mais critico e `vigente`: quando `true`, retorna licencas onde `(dataFim IS NULL OR dataFim >= CURRENT_DATE)`; quando `false`, retorna `(dataFim IS NOT NULL AND dataFim < CURRENT_DATE)`. Os filtros `razaoSocial` e `rubricaSigla` fazem join via `@ManyToOne` lazy ja definido na entidade `Licenca`. Inclui DTO `HistoricoStatusLicencaResponse` e sort parser com prefixo `-` para ordenacao descendente.

## Requisitos

- 3 records de query: `ListarLicencasQuery`, `BuscarLicencaPorIdQuery`, `ListarHistoricoStatusLicencaQuery`
- `ListarLicencasQueryHandler` usa `LicencaSpecification.comFiltros()` + `PageRequest` com sort parser
- Sort parser: campo prefixado com `-` = DESC (ex: `-dataInicio` → `dataInicio DESC`), sem prefixo = ASC
- `BuscarLicencaPorIdQueryHandler`: findById → 404 se nao encontrado; mapeia com dados expandidos de UsuarioMusica e Rubrica
- `ListarHistoricoStatusLicencaQueryHandler`: busca historico por licencaId (nao valida existencia da licenca — retorna lista vazia se nao houver registros)
- `LicencaSpecification` com 5 filtros independentes (cada um retorna null se parametro for null/blank):
  - `usuarioMusicaId`: exact match em `licenca.usuarioMusicaId`
  - `razaoSocial`: ILIKE via join com `usuarioMusica.razaoSocial`
  - `rubricaSigla`: ILIKE via join com `rubrica.sigla`
  - `status`: exact match em `licenca.status`
  - `vigente`: true → `(dataFim IS NULL OR dataFim >= hoje)`, false → `(dataFim IS NOT NULL AND dataFim < hoje)`
- DTO `HistoricoStatusLicencaResponse` criado nesta tarefa
- Teste unitario para `ListarLicencasQueryHandlerTest` com cenarios de filtros

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/ListarLicencasQuery.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/BuscarLicencaPorIdQuery.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/ListarHistoricoStatusLicencaQuery.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/handlers/ListarLicencasQueryHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/handlers/BuscarLicencaPorIdQueryHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/handlers/ListarHistoricoStatusLicencaQueryHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/specification/LicencaSpecification.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/HistoricoStatusLicencaResponse.java`
  - `services/arrecadacao-api/arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/queries/handlers/ListarLicencasQueryHandlerTest.java`
- **Modificar:** Nenhum
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/handlers/ListarUsuariosMusicaQueryHandler.java` (padrao de query handler paginado)
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/specification/UsuarioMusicaSpecification.java` (padrao de Specification)
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/PageResponse.java` (DTO paginacao reutilizado)
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/LicencaResponse.java` (criado na tarefa 4.0)

## Subtarefas

- [ ] 5.1 Criar os 3 records de query
- [ ] 5.2 Criar `HistoricoStatusLicencaResponse` DTO
- [ ] 5.3 Implementar `LicencaSpecification` com 5 filtros e logica `vigente`
- [ ] 5.4 Implementar `ListarLicencasQueryHandler` com sort parser e Specification
- [ ] 5.5 Implementar `BuscarLicencaPorIdQueryHandler` com expansao de dados
- [ ] 5.6 Implementar `ListarHistoricoStatusLicencaQueryHandler`
- [ ] 5.7 Criar `ListarLicencasQueryHandlerTest` com cenarios de filtros

## Sequenciamento

- Bloqueado por: 4.0 (DTOs LicencaResponse, UsuarioMusicaResumoResponse e RubricaResumoResponse ja existem)
- Desbloqueia: 6.0 (controller)
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-14 (listar com paginacao e filtros), RF-15 (filtro vigente), RF-16 (buscar por ID), RF-17 (historico de status)
- Evidencia esperada: testes unitarios passam; modulo application compila

## Detalhes de Implementacao

**Queries:**

```java
public record ListarLicencasQuery(
    int page, int size, String sort,
    UUID usuarioMusicaId, String razaoSocial, String rubricaSigla,
    StatusLicenca status, Boolean vigente
) implements Query<PageResponse<LicencaResponse>> {}

public record BuscarLicencaPorIdQuery(UUID id) implements Query<LicencaResponse> {}

public record ListarHistoricoStatusLicencaQuery(UUID licencaId)
    implements Query<List<HistoricoStatusLicencaResponse>> {}
```

**HistoricoStatusLicencaResponse:**

```java
public record HistoricoStatusLicencaResponse(
    UUID id,
    String statusAnterior,  // null para criacao inicial
    String statusNovo,
    String justificativa,
    String autor,
    Instant data
) {}
```

**LicencaSpecification (implementacao completa):**

```java
public class LicencaSpecification {

    public static Specification<Licenca> comFiltros(
            UUID usuarioMusicaId, String razaoSocial, String rubricaSigla,
            StatusLicenca status, Boolean vigente) {
        return Specification.where(usuarioMusicaIdIgual(usuarioMusicaId))
                .and(razaoSocialContem(razaoSocial))
                .and(rubricaSiglaContem(rubricaSigla))
                .and(statusIgual(status))
                .and(vigente(vigente));
    }

    private static Specification<Licenca> usuarioMusicaIdIgual(UUID valor) {
        if (valor == null) return null;
        return (root, query, cb) ->
            cb.equal(root.get("usuarioMusicaId"), valor);
    }

    private static Specification<Licenca> razaoSocialContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return (root, query, cb) ->
            cb.like(cb.lower(root.get("usuarioMusica").get("razaoSocial")),
                    "%" + valor.toLowerCase() + "%");
    }

    private static Specification<Licenca> rubricaSiglaContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return (root, query, cb) ->
            cb.like(cb.lower(root.get("rubrica").get("sigla")),
                    "%" + valor.toLowerCase() + "%");
    }

    private static Specification<Licenca> statusIgual(StatusLicenca valor) {
        if (valor == null) return null;
        return (root, query, cb) ->
            cb.equal(root.get("status"), valor);
    }

    private static Specification<Licenca> vigente(Boolean valor) {
        if (valor == null) return null;
        return (root, query, cb) -> {
            var hoje = LocalDate.now();
            if (valor) {
                // vigente=true: dataFim nula OU dataFim >= hoje
                return cb.or(
                    cb.isNull(root.get("dataFim")),
                    cb.greaterThanOrEqualTo(root.get("dataFim"), hoje));
            } else {
                // vigente=false: dataFim preenchida E dataFim < hoje
                return cb.and(
                    cb.isNotNull(root.get("dataFim")),
                    cb.lessThan(root.get("dataFim"), hoje));
            }
        };
    }
}
```

**Sort parser (em ListarLicencasQueryHandler):**

```java
private Sort parseSort(String sort) {
    if (sort == null || sort.isBlank()) {
        return Sort.by(Sort.Direction.DESC, "criadoEm");
    }
    if (sort.startsWith("-")) {
        return Sort.by(Sort.Direction.DESC, sort.substring(1));
    }
    return Sort.by(Sort.Direction.ASC, sort);
}
```

**ListarLicencasQueryHandler:**

```java
@Component
public class ListarLicencasQueryHandler
        implements QueryHandler<ListarLicencasQuery, PageResponse<LicencaResponse>> {

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LicencaResponse> handle(ListarLicencasQuery query) {
        var spec = LicencaSpecification.comFiltros(
            query.usuarioMusicaId(), query.razaoSocial(), query.rubricaSigla(),
            query.status(), query.vigente());

        var pageable = PageRequest.of(query.page(), query.size(), parseSort(query.sort()));
        var page = licencaRepository.findAll(spec, pageable);

        var content = page.getContent().stream()
            .map(licenca -> {
                var usuario = usuarioMusicaRepository.findById(licenca.getUsuarioMusicaId()).orElseThrow();
                var rubrica = rubricaRepository.findById(licenca.getRubricaId()).orElseThrow();
                return toResponse(licenca, usuario, rubrica);
            })
            .toList();

        return new PageResponse<>(content, page.getTotalElements(),
            page.getTotalPages(), page.getNumber(), page.getSize());
    }
}
```

**Cenarios de teste para ListarLicencasQueryHandlerTest:**
- Sem filtros: retorna pagina com todos os resultados mockados
- Com filtro `usuarioMusicaId`: verifica que Specification e chamada com o valor correto
- Com filtro `status=ATIVA`: verifica filtragem por status
- Com filtro `vigente=true`: verifica que Specification e construida com Boolean.TRUE
- Com filtro `vigente=false`: verifica que Specification e construida com Boolean.FALSE
- Com sort `"-dataInicio"`: verifica PageRequest criado com DESC

## Criterios de Sucesso (Verificaveis)

- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-application`
- [ ] Testes unitarios passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-application`
- [ ] `ListarLicencasQueryHandlerTest` — todos os 6 cenarios passam
- [ ] `LicencaSpecification.vigente(true)` gera predicate com OR (isNull OR greaterThanOrEqualTo)
- [ ] `LicencaSpecification.vigente(false)` gera predicate com AND (isNotNull AND lessThan)
- [ ] Filtros com valor null retornam null (nao adicionam restricao ao WHERE)
- [ ] Sort com prefixo `-` resulta em `Sort.Direction.DESC`
