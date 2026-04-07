---
status: pending
parallelizable: false
blocked_by: ["5.0"]
---

<task_context>
<domain>arrecadacao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"7.0, 8.0"</unblocks>
</task_context>

# Tarefa 6.0: API Layer — UdaController + PagamentoController + GlobalExceptionHandler

## Relacionada as User Stories

- [HU-01] Ajustar valor UDA (cobertura direta — POST /uda)
- [HU-02] Consultar historico UDA (cobertura direta — GET /uda/historico)
- [HU-03] Registrar pagamento (cobertura direta — POST /pagamentos)
- [HU-04] Consultar pagamentos (cobertura direta — GET /pagamentos)
- [HU-05] Visualizar detalhes pagamento (cobertura direta — GET /pagamentos/{id})
- [HU-06] Consultar UDA vigente (cobertura direta — GET /uda/vigente)

## Visao Geral

Criar os dois controllers REST com 6 endpoints totais, delegar ao Dispatcher CQRS, e estender o `GlobalExceptionHandler` com handlers para as novas exceptions (PagamentoDuplicadoException → 409, UdaVigenteNaoEncontradaException → 422). Controllers sao finos — apenas @Valid, mapeamento de request para command/query, e delegacao.

## Requisitos

- `UdaController` (/api/v1/uda): GET /vigente (ambos), POST / (analista), GET /historico (ambos)
- `PagamentoController` (/api/v1/pagamentos): GET / (ambos), POST / (analista), GET /{id} (ambos)
- @PreAuthorize para POST endpoints (analista)
- @Valid nos requests
- Logging SLF4J nos endpoints de escrita
- GlobalExceptionHandler: PagamentoDuplicadoException → 409, UdaVigenteNaoEncontradaException → 422, DataIntegrityViolationException (race condition unicidade) → 409

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/UdaController.java`
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/PagamentoController.java`
- **Modificar:**
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/GlobalExceptionHandler.java` (adicionar handlers para PagamentoDuplicadoException e UdaVigenteNaoEncontradaException)
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/LicencaController.java` (padrao de controller existente)
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/Dispatcher.java`
  - `tasks/arrecadacao/prd-registro-pagamentos/techspec.md` (secao API Layer)
- **Skills para consultar durante implementacao:**
  - `java-architecture` — controllers finos, CQRS dispatcher
  - `java-code-quality` — @Valid, constructor injection
  - `java-observability` — logging SLF4J nos endpoints de escrita
  - `common-restful-api` — paginacao, sort, RFC 7807

## Subtarefas

- [ ] 6.1 Criar `UdaController` com 3 endpoints (GET vigente, POST ajustar, GET historico)
- [ ] 6.2 Criar `PagamentoController` com 3 endpoints (GET listar, POST registrar, GET por id)
- [ ] 6.3 Adicionar @PreAuthorize nos POSTs (analista)
- [ ] 6.4 Estender `GlobalExceptionHandler` com handlers para PagamentoDuplicadoException (409) e UdaVigenteNaoEncontradaException (422)
- [ ] 6.5 Adicionar handler para DataIntegrityViolationException com mensagem de conflito (409) — safety net para race condition

## Sequenciamento

- Bloqueado por: 5.0
- Desbloqueia: 7.0, 8.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-03, RF-04, RF-05, RF-08, RF-14
- Evidencia esperada: endpoints respondem HTTP; erros retornam ProblemDetail RFC 7807

## Detalhes de Implementacao

**UdaController:**

```java
@RestController
@RequestMapping("/api/v1/uda")
@Tag(name = "UDA")
public class UdaController {

    private static final Logger LOGGER = LoggerFactory.getLogger(UdaController.class);
    private final Dispatcher dispatcher;

    public UdaController(Dispatcher dispatcher) {
        this.dispatcher = dispatcher;
    }

    @GetMapping("/vigente")
    public ResponseEntity<UdaResponse> consultarVigente() {
        return ResponseEntity.ok(dispatcher.query(new ConsultarUdaVigenteQuery()));
    }

    @PostMapping
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<UdaResponse> ajustar(@Valid @RequestBody AjustarUdaRequest request,
                                                Authentication auth) {
        LOGGER.info("Adjusting UDA value: valor={}, dataVigencia={}, user={}",
            request.valor(), request.dataVigencia(), auth.getName());
        var cmd = new AjustarUdaCommand(request.valor(), request.dataVigencia(), auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(dispatcher.dispatch(cmd));
    }

    @GetMapping("/historico")
    public ResponseEntity<List<UdaResponse>> listarHistorico() {
        return ResponseEntity.ok(dispatcher.query(new ListarHistoricoUdaQuery()));
    }
}
```

**PagamentoController:**

```java
@RestController
@RequestMapping("/api/v1/pagamentos")
@Tag(name = "Pagamentos")
public class PagamentoController {

    private static final Logger LOGGER = LoggerFactory.getLogger(PagamentoController.class);
    private final Dispatcher dispatcher;

    public PagamentoController(Dispatcher dispatcher) {
        this.dispatcher = dispatcher;
    }

    @GetMapping
    public ResponseEntity<PageResponse<PagamentoResponse>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "-dataRegistro") String sort,
            @RequestParam(required = false) UUID usuarioMusicaId,
            @RequestParam(required = false) String razaoSocial,
            @RequestParam(required = false) String rubricaSigla,
            @RequestParam(required = false) String periodo,
            @RequestParam(required = false) StatusPagamento status) {
        var query = new ListarPagamentosQuery(page, size, sort,
            usuarioMusicaId, razaoSocial, rubricaSigla, periodo, status);
        return ResponseEntity.ok(dispatcher.query(query));
    }

    @PostMapping
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<PagamentoResponse> registrar(
            @Valid @RequestBody RegistrarPagamentoRequest request,
            Authentication auth) {
        LOGGER.info("Registering payment: licencaId={}, quantidadeUdas={}, user={}",
            request.licencaId(), request.quantidadeUdas(), auth.getName());
        var cmd = new RegistrarPagamentoCommand(
            request.licencaId(), request.quantidadeUdas(), auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(dispatcher.dispatch(cmd));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PagamentoResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(dispatcher.query(new BuscarPagamentoPorIdQuery(id)));
    }
}
```

**GlobalExceptionHandler (extensao):**

```java
@ExceptionHandler(PagamentoDuplicadoException.class)
public ResponseEntity<ProblemDetail> handlePagamentoDuplicado(PagamentoDuplicadoException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    problem.setTitle("Duplicate Payment");
    return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
}

@ExceptionHandler(UdaVigenteNaoEncontradaException.class)
public ResponseEntity<ProblemDetail> handleUdaVigenteNaoEncontrada(
        UdaVigenteNaoEncontradaException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
        HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    problem.setTitle("UDA Value Not Found");
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
}
```

**Convencoes da stack:**
- Controllers finos: apenas @Valid + dispatch
- Logging SLF4J com placeholders {} (nunca concatenacao)
- ProblemDetail RFC 7807 para erros
- @PreAuthorize para seguranca por endpoint

## Criterios de Sucesso (Verificaveis)

- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-api`
- [ ] Endpoints respondem: GET /api/v1/uda/vigente, POST /api/v1/uda, GET /api/v1/uda/historico
- [ ] Endpoints respondem: GET /api/v1/pagamentos, POST /api/v1/pagamentos, GET /api/v1/pagamentos/{id}
- [ ] PagamentoDuplicadoException retorna 409 com ProblemDetail
- [ ] UdaVigenteNaoEncontradaException retorna 422 com ProblemDetail
