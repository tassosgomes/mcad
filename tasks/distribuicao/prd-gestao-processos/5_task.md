---
status: pending
parallelizable: false
blocked_by: ["4.0", "1.5"]
---

<task_context>
<domain>distribuicao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 5.0: Queries + Controller + Exception handler

## Relacionada às User Stories

- [HU-03] Listar e filtrar processos (direta)
- [HU-04] Visualizar detalhes (direta)
- [HU-02] Criar processo — endpoint (direta)
- [HU-05/06/07] Aprovar/Finalizar/Cancelar — endpoints (direta)

## Visão Geral

Implementar queries CQRS (listar com filtros+paginação, buscar por ID, listar disponíveis), DTOs, o ProcessoController com 9 endpoints conforme api-contract.yaml, e handlers de exceção para TransicaoInvalida (422), Conflict (409) e PreRequisitos (422).

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/ListarProcessosQuery.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/BuscarProcessoPorIdQuery.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/ListarDisponiveisQuery.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/handlers/ListarProcessosQueryHandler.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/handlers/BuscarProcessoPorIdQueryHandler.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/handlers/ListarDisponiveisQueryHandler.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/dto/ProcessoResponse.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/dto/DisponibilidadeResponse.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/dto/CriarProcessoRequest.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/dto/CancelarProcessoRequest.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/dto/RubricaResumoDto.java`
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/ProcessoController.java`
- **Modificar:**
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/config/GlobalExceptionHandler.java` (adicionar handlers 409, 422)
- **Referência:**
  - `tasks/distribuicao/prd-gestao-processos/api-contract.yaml` (contrato)
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/PagamentoController.java` (padrão de `@RequiresPermission`)
  - `docs/adr/0002-permission-naming-convention.md`, `docs/adr/0003-backend-authoritative-authorization.md`

## Subtarefas

- [ ] 5.1 Criar DTOs: ProcessoResponse, DisponibilidadeResponse, CriarProcessoRequest, CancelarProcessoRequest, RubricaResumoDto
- [ ] 5.2 Criar queries records (3 queries)
- [ ] 5.3 Implementar ListarProcessosQueryHandler (Specification + Pageable)
- [ ] 5.4 Implementar BuscarProcessoPorIdQueryHandler
- [ ] 5.5 Implementar ListarDisponiveisQueryHandler (cruzar snapshots - processos ativos)
- [ ] 5.6 Criar ProcessoController com 9 endpoints conforme api-contract.yaml
- [ ] 5.7 **Anotar cada método do controller com `@RequiresPermission("distribuicao:default:processo:<acao>")`** — keys conforme `permissions.yaml` criado em 1.5 (NÃO usar `@PreAuthorize`)
- [ ] 5.8 Adicionar handlers no GlobalExceptionHandler: TransicaoInvalidaException→422, ConflictException→409, PreRequisitosException→422
- [ ] 5.9 Extrair `Authentication.getName()` (ou JWT claim) no controller e passar como `autor`/`analistaResponsavel` para os commands de escrita
- [ ] 5.10 Verificar compilação

## Sequenciamento

- Bloqueado por: 4.0 (command handlers usados pelo controller)
- Desbloqueia: 6.0
- Paralelizável: Não (caminho crítico)

## Detalhes de Implementação

**ListarDisponiveisQueryHandler** — query customizada:
```java
// Retornar combinações (rubrica+período) onde:
// 1. Existe SnapshotRol não cancelado
// 2. Existe SnapshotVerba
// 3. NÃO existe ProcessoDistribuicao com status != CANCELADO
```

**ProcessoController** — `@RequiresPermission` + extração de `autor` pelo `Authentication`:

```java
import br.org.ecad.authz.sdk.annotation.RequiresPermission;
import org.springframework.security.core.Authentication;

@PostMapping
@RequiresPermission("distribuicao:default:processo:criar")
public ResponseEntity<ProcessoResponse> criar(
        @Valid @RequestBody CriarProcessoRequest request,
        Authentication auth) {
    var analista = auth.getName();   // username do JWT
    var cmd = new CriarProcessoCommand(request.rubricaSigla(), request.periodo(), analista);
    var response = dispatcher.dispatch(cmd);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}

@PostMapping("/{id}/aprovar")
@RequiresPermission("distribuicao:default:processo:aprovar")
public ResponseEntity<ProcessoResponse> aprovar(@PathVariable UUID id, Authentication auth) {
    return ResponseEntity.ok(dispatcher.dispatch(new AprovarProcessoCommand(id, auth.getName())));
}
// ...mesmo padrão para calcular, finalizar, cancelar
```

> **NÃO usar `@PreAuthorize`** — todas as decisões de autorização vão pelo `authz-spring-boot-starter`. O catálogo `permissions.yaml` (task 1.5) já define essas 7 keys; o starter rejeita anotações com keys que não estejam no catálogo registrado.

**GlobalExceptionHandler additions:**
```java
@ExceptionHandler(TransicaoInvalidaException.class)
public ProblemDetail handleTransicaoInvalida(TransicaoInvalidaException ex, HttpServletRequest request) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    problem.setTitle("Unprocessable Entity");
    problem.setInstance(URI.create(request.getRequestURI()));
    return problem;
}

@ExceptionHandler(ConflictException.class)
public ProblemDetail handleConflict(ConflictException ex, HttpServletRequest request) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    problem.setTitle("Conflict");
    problem.setInstance(URI.create(request.getRequestURI()));
    return problem;
}
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/distribuicao-api && mvn compile`
- [ ] GET /api/v1/processos/disponiveis retorna array (com `distribuicao:default:processo:listar`)
- [ ] GET /api/v1/processos retorna paginação (items + metadata) (com `distribuicao:default:processo:listar`)
- [ ] POST /api/v1/processos retorna 201 (com `distribuicao:default:processo:criar`)
- [ ] POST /api/v1/processos com duplicata retorna 409
- [ ] POST /api/v1/processos/{id}/aprovar de CRIADO retorna 422
- [ ] POST /api/v1/processos/{id}/cancelar com justificativa < 10 chars retorna 400
- [ ] **Nenhum método do `ProcessoController` usa `@PreAuthorize` — apenas `@RequiresPermission`**
- [ ] **Todas as 7 keys usadas no controller estão declaradas no `permissions.yaml` (task 1.5)** — bate por inspeção visual e pelos testes 401/403 da task 6.0
