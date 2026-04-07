---
status: completed
parallelizable: false
blocked_by: ["5.0"]
---

<task_context>
<domain>arrecadacao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: API Layer — LicencaController com 7 endpoints

## Relacionada as User Stories
- [HU-01] Criar Licenca (cobertura direta — POST /licencas)
- [HU-02] Suspender Licenca (cobertura direta — POST /licencas/{id}/suspender)
- [HU-03] Reativar Licenca (cobertura direta — POST /licencas/{id}/reativar)
- [HU-04] Encerrar Licenca (cobertura direta — POST /licencas/{id}/encerrar)
- [HU-05] Visualizar historico (cobertura direta — GET /licencas/{id}/historico-status)
- [HU-06] Listar licencas (cobertura direta — GET /licencas)
- [HU-07] Buscar licenca por ID (cobertura direta — GET /licencas/{id})

## Visao Geral

Implementar o `LicencaController` com os 7 endpoints REST definidos no api-contract. Endpoints de escrita exigem role `analista-arrecadacao`. O autor das operacoes e extraido do JWT claim `preferred_username` com fallback para `sub`. Padrao identico ao controller de UsuarioMusica (F02).

## Requisitos

- Controller com `@RequestMapping("/api/v1/licencas")` e `@Tag(name = "Licencas")`
- Endpoints de leitura (GET): acessiveis com qualquer JWT valido
- Endpoints de escrita (POST): `@PreAuthorize("hasRole('analista-arrecadacao')")`
- Extração do autor do JWT: `principal.getClaimAsString("preferred_username")`, fallback `principal.getSubject()`
- `GET /licencas` recebe parametros de query: `page` (default 0), `size` (default 20), `sort`, `usuarioMusicaId`, `razaoSocial`, `rubricaSigla`, `status`, `vigente`
- `POST /licencas` recebe `CriarLicencaRequest` com `@Valid`, retorna 201 Created
- `GET /licencas/{id}` retorna 200 ou 404
- `POST /licencas/{id}/suspender` recebe `TransicaoStatusRequest` com `@Valid`, retorna 200
- `POST /licencas/{id}/reativar` recebe `TransicaoStatusRequest` com `@Valid`, retorna 200
- `POST /licencas/{id}/encerrar` recebe `TransicaoStatusRequest` com `@Valid`, retorna 200
- `GET /licencas/{id}/historico-status` retorna lista (200)
- Documentacao OpenAPI com `@Operation(operationId = "...")` seguindo api-contract

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/LicencaController.java`
- **Modificar:** Nenhum
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/UsuarioMusicaController.java` (padrao do controller F02 — extrair exatamente o mesmo padrao)
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/GlobalExceptionHandler.java` (trata 404, 422, 400)
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/SecurityConfig.java` (configuracao de seguranca e roles)
  - `tasks/arrecadacao/prd-gestao-licencas/api-contract.yaml` (operationIds e parametros exatos)

## Subtarefas

- [ ] 6.1 Criar `LicencaController` com estrutura base (anotacoes, injecao de dependencias)
- [ ] 6.2 Implementar GET /licencas com todos os parametros de query e paginacao
- [ ] 6.3 Implementar POST /licencas com validacao e extracao de autor do JWT
- [ ] 6.4 Implementar GET /licencas/{id}
- [ ] 6.5 Implementar POST /licencas/{id}/suspender
- [ ] 6.6 Implementar POST /licencas/{id}/reativar
- [ ] 6.7 Implementar POST /licencas/{id}/encerrar
- [ ] 6.8 Implementar GET /licencas/{id}/historico-status
- [ ] 6.9 Verificar que o modulo arrecadacao-api compila

## Sequenciamento

- Bloqueado por: 5.0 (queries, handlers e DTOs completos)
- Desbloqueia: 7.0 (testes de integracao de endpoints)
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: todos os 7 endpoints do api-contract de F03
- Evidencia esperada: modulo arrecadacao-api compila; endpoints testados na tarefa 7.0

## Detalhes de Implementacao

**LicencaController.java (estrutura completa):**

```java
@RestController
@RequestMapping("/api/v1/licencas")
@Tag(name = "Licencas", description = "Gerenciamento de licencas de uso de musica")
public class LicencaController {

    private final CommandDispatcher commandDispatcher;
    private final QueryDispatcher queryDispatcher;

    public LicencaController(CommandDispatcher commandDispatcher,
                              QueryDispatcher queryDispatcher) {
        this.commandDispatcher = commandDispatcher;
        this.queryDispatcher = queryDispatcher;
    }

    @GetMapping
    @Operation(operationId = "listarLicencas", summary = "Listar licencas com filtros e paginacao")
    public ResponseEntity<PageResponse<LicencaResponse>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) UUID usuarioMusicaId,
            @RequestParam(required = false) String razaoSocial,
            @RequestParam(required = false) String rubricaSigla,
            @RequestParam(required = false) StatusLicenca status,
            @RequestParam(required = false) Boolean vigente) {
        var query = new ListarLicencasQuery(page, size, sort,
            usuarioMusicaId, razaoSocial, rubricaSigla, status, vigente);
        return ResponseEntity.ok(queryDispatcher.dispatch(query));
    }

    @PostMapping
    @PreAuthorize("hasRole('analista-arrecadacao')")
    @Operation(operationId = "criarLicenca", summary = "Criar nova licenca")
    public ResponseEntity<LicencaResponse> criar(
            @Valid @RequestBody CriarLicencaRequest request,
            JwtAuthenticationToken principal) {
        var autor = extrairAutor(principal);
        var command = new CriarLicencaCommand(
            request.usuarioMusicaId(), request.rubricaId(),
            request.dataInicio(), request.dataFim(), autor);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(commandDispatcher.dispatch(command));
    }

    @GetMapping("/{id}")
    @Operation(operationId = "buscarLicencaPorId", summary = "Buscar licenca por ID")
    public ResponseEntity<LicencaResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(queryDispatcher.dispatch(new BuscarLicencaPorIdQuery(id)));
    }

    @PostMapping("/{id}/suspender")
    @PreAuthorize("hasRole('analista-arrecadacao')")
    @Operation(operationId = "suspenderLicenca", summary = "Suspender licenca ativa")
    public ResponseEntity<LicencaResponse> suspender(
            @PathVariable UUID id,
            @Valid @RequestBody TransicaoStatusRequest request,
            JwtAuthenticationToken principal) {
        var autor = extrairAutor(principal);
        var command = new SuspenderLicencaCommand(id, request.justificativa(), autor);
        return ResponseEntity.ok(commandDispatcher.dispatch(command));
    }

    @PostMapping("/{id}/reativar")
    @PreAuthorize("hasRole('analista-arrecadacao')")
    @Operation(operationId = "reativarLicenca", summary = "Reativar licenca suspensa")
    public ResponseEntity<LicencaResponse> reativar(
            @PathVariable UUID id,
            @Valid @RequestBody TransicaoStatusRequest request,
            JwtAuthenticationToken principal) {
        var autor = extrairAutor(principal);
        var command = new ReativarLicencaCommand(id, request.justificativa(), autor);
        return ResponseEntity.ok(commandDispatcher.dispatch(command));
    }

    @PostMapping("/{id}/encerrar")
    @PreAuthorize("hasRole('analista-arrecadacao')")
    @Operation(operationId = "encerrarLicenca", summary = "Encerrar licenca suspensa")
    public ResponseEntity<LicencaResponse> encerrar(
            @PathVariable UUID id,
            @Valid @RequestBody TransicaoStatusRequest request,
            JwtAuthenticationToken principal) {
        var autor = extrairAutor(principal);
        var command = new EncerrarLicencaCommand(id, request.justificativa(), autor);
        return ResponseEntity.ok(commandDispatcher.dispatch(command));
    }

    @GetMapping("/{id}/historico-status")
    @Operation(operationId = "listarHistoricoStatusLicenca",
               summary = "Listar historico de status da licenca")
    public ResponseEntity<List<HistoricoStatusLicencaResponse>> listarHistorico(
            @PathVariable UUID id) {
        return ResponseEntity.ok(
            queryDispatcher.dispatch(new ListarHistoricoStatusLicencaQuery(id)));
    }

    // Extrai autor do JWT: preferred_username com fallback para sub
    private String extrairAutor(JwtAuthenticationToken principal) {
        var preferred = principal.getToken().getClaimAsString("preferred_username");
        return (preferred != null && !preferred.isBlank())
            ? preferred
            : principal.getToken().getSubject();
    }
}
```

**Tabela de endpoints e autorizacao:**

| Metodo | Path | Autorizacao | HTTP Success |
|--------|------|-------------|--------------|
| GET | /api/v1/licencas | JWT (qualquer role) | 200 |
| POST | /api/v1/licencas | JWT + analista-arrecadacao | 201 |
| GET | /api/v1/licencas/{id} | JWT (qualquer role) | 200 |
| POST | /api/v1/licencas/{id}/suspender | JWT + analista-arrecadacao | 200 |
| POST | /api/v1/licencas/{id}/reativar | JWT + analista-arrecadacao | 200 |
| POST | /api/v1/licencas/{id}/encerrar | JWT + analista-arrecadacao | 200 |
| GET | /api/v1/licencas/{id}/historico-status | JWT (qualquer role) | 200 |

**Respostas de erro (tratadas pelo GlobalExceptionHandler existente):**

| Excecao | HTTP |
|---------|------|
| `EntidadeNaoEncontradaException` | 404 Not Found |
| `IllegalStateException` | 422 Unprocessable Entity |
| `MethodArgumentNotValidException` | 400 Bad Request |
| Sem JWT ou JWT invalido | 401 Unauthorized |
| Role insuficiente (consultor tentando escrever) | 403 Forbidden |

## Criterios de Sucesso (Verificaveis)

- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-api`
- [ ] Build completo do servico: `cd services/arrecadacao-api && mvn compile`
- [ ] POST /licencas sem role analista-arrecadacao retorna 403
- [ ] GET /licencas sem autenticacao retorna 401
- [ ] Endpoints de escrita extraem autor corretamente do JWT (`preferred_username` fallback `sub`)
- [ ] `@Valid` em requests de criacao e transicao — campo obrigatorio ausente retorna 400
- [ ] Controller nao possui logica de negocio — apenas mapeia HTTP para commands/queries
