---
status: pending
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

# Tarefa 5.0: Queries, DTOs, Specification e Handlers + testes unitarios

## Relacionada as User Stories

- [HU-02] Consultar historico UDA (cobertura direta)
- [HU-04] Consultar pagamentos (cobertura direta)
- [HU-05] Visualizar detalhes pagamento (cobertura direta)
- [HU-06] Consultar UDA vigente (cobertura direta)

## Visao Geral

Implementar as 4 queries com handlers, DTOs de request/response, e `PagamentoSpecification` com 5 filtros (incluindo joins via @ManyToOne). Queries: `ConsultarUdaVigente`, `ListarHistoricoUda`, `ListarPagamentos`, `BuscarPagamentoPorId`. DTOs incluem `UdaResponse`, `PagamentoResponse`, `LicencaResumoResponse` (se nao existente), requests com Bean Validation.

## Requisitos

- 4 queries (records implementando Query<R>)
- 4 query handlers (readOnly = true)
- DTOs: UdaResponse, AjustarUdaRequest, RegistrarPagamentoRequest, PagamentoResponse, LicencaResumoResponse
- PagamentoSpecification: 5 filtros (usuarioMusicaId, razaoSocial ILIKE, rubricaSigla ILIKE, periodo, status) com joins
- BigDecimal → String no JSON (toPlainString) para responses
- Bean Validation nos requests (@NotNull, @DecimalMin)

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/ConsultarUdaVigenteQuery.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/ListarHistoricoUdaQuery.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/ListarPagamentosQuery.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/BuscarPagamentoPorIdQuery.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/handlers/ConsultarUdaVigenteQueryHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/handlers/ListarHistoricoUdaQueryHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/handlers/ListarPagamentosQueryHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/handlers/BuscarPagamentoPorIdQueryHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/specification/PagamentoSpecification.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/UdaResponse.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/AjustarUdaRequest.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/PagamentoResponse.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/RegistrarPagamentoRequest.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/LicencaResumoResponse.java` (se nao existente do F03)
  - `services/arrecadacao-api/arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/queries/handlers/ListarPagamentosQueryHandlerTest.java`
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/Query.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/QueryHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/specification/LicencaSpecification.java` (padrao Specification)
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/PageResponse.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/UsuarioMusicaResumoResponse.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/RubricaResumoResponse.java`
- **Skills para consultar durante implementacao:**
  - `java-architecture` — CQRS Query/Handler, @Transactional(readOnly=true)
  - `java-code-quality` — records para DTOs, Bean Validation
  - `common-restful-api` — paginacao, sort

## Subtarefas

- [ ] 5.1 Criar DTOs: `UdaResponse`, `AjustarUdaRequest`, `PagamentoResponse`, `RegistrarPagamentoRequest`, `LicencaResumoResponse`
- [ ] 5.2 Criar 4 queries (records)
- [ ] 5.3 Criar `ConsultarUdaVigenteQueryHandler` e `ListarHistoricoUdaQueryHandler`
- [ ] 5.4 Criar `PagamentoSpecification` com 5 filtros (joins via Pagamento → Licenca → UsuarioMusica/Rubrica)
- [ ] 5.5 Criar `ListarPagamentosQueryHandler` (Specification + Pageable + sort parser)
- [ ] 5.6 Criar `BuscarPagamentoPorIdQueryHandler` (com mapeamento expandido)
- [ ] 5.7 Criar `ListarPagamentosQueryHandlerTest` — filtros, paginacao

## Sequenciamento

- Bloqueado por: 4.0
- Desbloqueia: 6.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-02, RF-04, RF-05, RF-14, RF-15, RF-16, RF-17
- Evidencia esperada: testes unitarios passam; queries registram-se no dispatcher

## Detalhes de Implementacao

**DTOs:**

```java
public record UdaResponse(
    UUID id, String valor, LocalDate dataVigencia,
    Instant criadoEm, String criadoPor
) {}

public record AjustarUdaRequest(
    @NotNull BigDecimal valor,  // Bean Validation: > 0
    @NotNull LocalDate dataVigencia
) {}

public record PagamentoResponse(
    UUID id, LicencaResumoResponse licenca,
    String quantidadeUdas, String valorUdaNoMomento, String valorBruto,
    String periodo, String status,
    Instant dataRegistro, Instant criadoEm, Instant atualizadoEm
) {}

public record RegistrarPagamentoRequest(
    @NotNull UUID licencaId,
    @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal quantidadeUdas
) {}

// LicencaResumoResponse — verificar se ja existe do F03, se nao:
public record LicencaResumoResponse(
    UUID id, String status,
    UsuarioMusicaResumoResponse usuarioMusica,
    RubricaResumoResponse rubrica
) {}
```

**BigDecimal → String no mapeamento:**

```java
new PagamentoResponse(
    pagamento.getId(),
    mapLicencaResumo(pagamento.getLicenca()),
    pagamento.getQuantidadeUdas().toPlainString(),
    pagamento.getValorUdaNoMomento().toPlainString(),
    pagamento.getValorBruto().toPlainString(),
    pagamento.getPeriodo(),
    pagamento.getStatus().name(),
    pagamento.getDataRegistro(),
    pagamento.getCriadoEm(),
    pagamento.getAtualizadoEm()
);
```

**PagamentoSpecification:**

```java
public class PagamentoSpecification {
    public static Specification<Pagamento> comFiltros(
            UUID usuarioMusicaId, String razaoSocial,
            String rubricaSigla, String periodo,
            StatusPagamento status) {
        return Specification.where(usuarioMusicaIdIgual(usuarioMusicaId))
                .and(razaoSocialContem(razaoSocial))
                .and(rubricaSiglaIgual(rubricaSigla))
                .and(periodoIgual(periodo))
                .and(statusIgual(status));
    }

    private static Specification<Pagamento> usuarioMusicaIdIgual(UUID id) {
        if (id == null) return null;
        return (root, query, cb) -> {
            var licenca = root.join("licenca", JoinType.LEFT);
            return cb.equal(licenca.get("usuarioMusicaId"), id);
        };
    }

    private static Specification<Pagamento> razaoSocialContem(String razaoSocial) {
        if (razaoSocial == null || razaoSocial.isBlank()) return null;
        return (root, query, cb) -> {
            var licenca = root.join("licenca", JoinType.LEFT);
            var usuario = licenca.join("usuarioMusica", JoinType.LEFT);
            return cb.like(cb.lower(usuario.get("razaoSocial")),
                    "%" + razaoSocial.toLowerCase() + "%");
        };
    }

    private static Specification<Pagamento> rubricaSiglaIgual(String sigla) {
        if (sigla == null || sigla.isBlank()) return null;
        return (root, query, cb) -> {
            var licenca = root.join("licenca", JoinType.LEFT);
            var rubrica = licenca.join("rubrica", JoinType.LEFT);
            return cb.like(cb.lower(rubrica.get("sigla")),
                    "%" + sigla.toLowerCase() + "%");
        };
    }

    private static Specification<Pagamento> periodoIgual(String periodo) {
        if (periodo == null || periodo.isBlank()) return null;
        return (root, query, cb) -> cb.equal(root.get("periodo"), periodo);
    }

    private static Specification<Pagamento> statusIgual(StatusPagamento status) {
        if (status == null) return null;
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }
}
```

**ConsultarUdaVigenteQueryHandler:**

```java
@Service
@Transactional(readOnly = true)
public class ConsultarUdaVigenteQueryHandler
        implements QueryHandler<ConsultarUdaVigenteQuery, UdaResponse> {

    private final UdaValorRepository repository;

    @Override
    public UdaResponse handle(ConsultarUdaVigenteQuery query) {
        UdaValor uda = repository.findVigente(LocalDate.now())
            .orElseThrow(() -> new EntityNotFoundException("No UDA value found"));
        return mapToResponse(uda);
    }
}
```

**Convencoes da stack:**
- Query handlers com @Transactional(readOnly = true)
- Records para DTOs e queries
- Bean Validation (@NotNull, @DecimalMin) nos requests
- BigDecimal.toPlainString() para serializar valores monetarios

## Criterios de Sucesso (Verificaveis)

- [ ] Testes passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-application`
- [ ] `ListarPagamentosQueryHandlerTest` — filtros e paginacao
- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-application`
- [ ] DTOs serializam BigDecimal como String (toPlainString)
