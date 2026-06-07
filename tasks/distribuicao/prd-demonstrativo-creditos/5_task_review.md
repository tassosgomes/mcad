# Task Review — 5.0: DemonstrativoController + Authz

## Automated Validation Result

| Command | Status |
|---------|--------|
| `mvn compile test-compile -DskipTests` (full reactor) | PASS |

## Technical Review

### Scope Verification

- [x] `DemonstrativoController` created in `distribuicao-api/.../api/controllers/`
- [x] Endpoint `GET /api/v1/processos/{id}/demonstrativos` with `@RequiresPermission("distribuicao:default:demonstrativo:listar")`
- [x] Endpoint `GET /api/v1/processos/{id}/demonstrativos/{titularId}` with `@RequiresPermission("distribuicao:default:demonstrativo:visualizar")`
- [x] Query parameters handled: `titularNome`, `page`, `size`, `sort`
- [x] `size > 100` rejected with 400 (`ResponseStatusException(HttpStatus.BAD_REQUEST)`)
- [x] Two permission keys added to `permissions.yaml`
- [x] Authz catalog `docs/authz/catalog/distribuicao.md` updated with Demonstrativo section

### Code Quality

- Controller follows existing project pattern: `@RestController`, `@RequestMapping`, constructor injection.
- No business logic in controller — pure delegation to handlers.
- `@SuppressWarnings("null")` aligned with existing controllers.

### Architecture Compliance

- Controller lives in `api` layer as required.
- Uses `@RequiresPermission` from authz-starter (no `@PreAuthorize`).
- Permissions registered in `permissions.yaml` for automatic catalog registration at boot.

### Regression Fix

- Fixed `JpaCreditoRepositoryTest` (distribuicao-tests) to inject the new `SpringDataCreditoRepository` dependency required by the updated `JpaCreditoRepository` constructor.

## Final Recommendation

**APROVADA**

All acceptance criteria from `5_task.md` are met. Full reactor compiles successfully including test sources.
