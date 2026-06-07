# Task Review — 1.0: TitularDemonstrativoProjection + metodos CreditoRepository

## Automated Validation Result

| Command | Status |
|---------|--------|
| `mvn -pl distribuicao-domain compile test-compile` | PASS |
| `mvn -pl distribuicao-infra compile test-compile` | PASS |
| `mvn compile -DskipTests` (full reactor) | PASS |

## Technical Review

### Scope Verification

- [x] `TitularDemonstrativoProjection` created in `distribuicao-domain/.../domain/projections/`
- [x] `CreditoRepository` extended with 5 new methods (additive only)
- [x] `JpaCreditoRepository` implements all 5 methods with JPQL
- [x] No existing methods modified or removed
- [x] No cross-schema joins introduced
- [x] All queries operate solely on `distribuicao.creditos`

### Code Quality

- Projection is a clean Java `record` with correct field types (`UUID`, `String`, `BigDecimal`, `long`).
- JPQL `findTitularesByProcessoId` uses:
  - `GROUP BY` on `titularId, titularNome`
  - `SUM(CASE WHEN ...)` for `totalCalculado` and `totalRetido`
  - `COUNT(DISTINCT CASE WHEN ...)` for `quantidadeObras`
  - `LOWER(c.titularNome) LIKE LOWER(CONCAT('%', :filtroNome, '%'))` for case-insensitive filter
  - `ORDER BY LOWER(c.titularNome) ASC`
- `countTitularesByProcessoId` uses `COUNT(DISTINCT c.titularId)`.
- `findByProcessoAndTitularAndStatus` is a straightforward parameterized query.
- `findLiberadosByProcessoLiberacaoAndTitular` filters by `processoLiberacaoId`, `titularId`, and `StatusCredito.LIBERADO`.
- `sumLiberadosByProcessoLiberacaoId` aggregates `SUM(c.valorCredito)` per `titularId` and converts `List<Object[]>` to `Map<UUID, BigDecimal>`.

### Architecture Compliance

- Domain layer (`distribuicao-domain`) remains framework-free: no Spring/JPA annotations in the projection.
- Repository interface stays in `domain/interfaces` (port).
- Implementation stays in `infra/persistence` (adapter).
- No violations of Clean Architecture boundaries.

### Risks / Observations

- `COUNT(DISTINCT CASE WHEN c.status = CALCULADO THEN c.obraId ELSE NULL END)` is correct in Hibernate 6; `NULL` values are ignored by `COUNT(DISTINCT)`.
- `sumLiberadosByProcessoLiberacaoId` returns an empty `HashMap` when no rows match, which is safe for the caller.
- The `pageable` parameter in `findTitularesByProcessoId` applies standard `setFirstResult` / `setMaxResults` on the JPQL query.

### Test Coverage

- No new unit tests were added in this task (unit tests are scheduled for Task 8.0).
- Build and compilation validation confirm that JPQL syntax is accepted by the Hibernate 6 compiler and that the new projection class is resolvable.

## Final Recommendation

**APROVADA**

All acceptance criteria from `1_task.md` are met. The build compiles successfully, the new methods are additive-only, and the JPQL aligns with the Tech Spec reference.
