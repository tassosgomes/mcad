---
status: completed
parallelizable: false
blocked_by: ["5.0"]
---

<task_context>
<domain>arrecadacao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: API Layer — controller, exception handler e seguranca

## Relacionada as User Stories

- [HU-01] Cadastrar (cobertura direta — POST /usuarios-musica)
- [HU-03] Editar (cobertura direta — PUT /usuarios-musica/{id})
- [HU-04] Inativar (cobertura direta — POST /usuarios-musica/{id}/inativar)
- [HU-05] Reativar (cobertura direta — POST /usuarios-musica/{id}/ativar)
- [HU-06] Consultar (cobertura direta — GET /usuarios-musica)
- [HU-07] Historico (cobertura direta — GET /usuarios-musica/{id}/historico-status)

## Visao Geral

Implementar o UsuarioMusicaController com 7 endpoints REST, atualizar o GlobalExceptionHandler para tratar excecoes de dominio (404, 409, 422, 400) com RFC 7807, e atualizar CorsConfig para permitir metodos POST/PUT. Seguranca via @PreAuthorize com roles Keycloak. Autor extraido do JWT claim `preferred_username`.

## Requisitos

- 7 endpoints conforme api-contract.yaml
- @PreAuthorize("hasRole('analista-arrecadacao')") nos endpoints de escrita
- GET endpoints acessiveis por ambos os perfis
- Autor do JWT: SecurityContextHolder → JwtAuthenticationToken → preferred_username
- GlobalExceptionHandler com handlers para: IllegalArgumentException (422), IllegalStateException (422), EntidadeNaoEncontradaException (404), CnpjDuplicadoException (409), MethodArgumentNotValidException (400)
- CorsConfig: adicionar POST, PUT aos allowed-methods
- Logging: INFO para criacao/status change, WARN para erros de negocio

## Arquivos Envolvidos

- **Criar:**
  - `arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/UsuarioMusicaController.java`
- **Modificar:**
  - `arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/GlobalExceptionHandler.java` (adicionar handlers especificos)
  - `arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/CorsConfig.java` (adicionar POST, PUT)
- **Referencia:**
  - `arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/SecurityConfig.java` (verificar @EnableMethodSecurity)
  - `tasks/arrecadacao/prd-gestao-usuarios-musica/api-contract.yaml` (contratos exatos)
- **Skills para consultar:**
  - `java-architecture` — controller pattern, @PreAuthorize
  - `java-code-quality` — logging estruturado, exception handling
  - `java-observability` — log levels, MDC correlation
  - `common-restful-api` — RFC 7807 ProblemDetail, HTTP status codes

## Subtarefas

- [x] 6.1 Criar UsuarioMusicaController com 7 endpoints, dispatching para commands/queries
- [x] 6.2 Implementar extracao de autor do JWT (SecurityContextHolder → preferred_username, fallback sub)
- [x] 6.3 Atualizar GlobalExceptionHandler com handlers especificos (404, 409, 422, 400)
- [x] 6.4 Atualizar CorsConfig para incluir POST, PUT nos allowed-methods
- [x] 6.5 Adicionar logging nos endpoints: INFO criacao/status, WARN erros negocio
- [x] 6.6 Verificar que @PreAuthorize funciona (analista pode escrever, consultor so le)

## Sequenciamento

- Bloqueado por: 5.0
- Desbloqueia: 7.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: todos os endpoints do api-contract (7 endpoints)
- Evidencia esperada: endpoints respondem conforme contrato; seguranca por role funcional

## Detalhes de Implementacao

**Controller (resumo):**
```java
@RestController
@RequestMapping("/api/v1/usuarios-musica")
@Tag(name = "Usuarios de Musica")
public class UsuarioMusicaController {
    private final CommandDispatcher commandDispatcher;
    private final QueryDispatcher queryDispatcher;

    @GetMapping
    public ResponseEntity<PageResponse<UsuarioMusicaResponse>> listar(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "razaoSocial") String sort,
            @RequestParam(required = false) String razaoSocial,
            @RequestParam(required = false) String cnpj,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String cidade) {
        StatusUsuarioMusica statusEnum = status != null ? StatusUsuarioMusica.valueOf(status) : null;
        var query = new ListarUsuariosMusicaQuery(page, size, sort, razaoSocial, cnpj, statusEnum, cidade);
        return ResponseEntity.ok(queryDispatcher.dispatch(query));
    }

    @PostMapping
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<UsuarioMusicaResponse> criar(
            @Valid @RequestBody CriarUsuarioMusicaRequest request) {
        String autor = extrairAutorDoJwt();
        var command = new CriarUsuarioMusicaCommand(
            request.razaoSocial(), request.nomeFantasia(), request.cnpj(),
            request.endereco(), request.contato(), autor);
        var response = commandDispatcher.dispatch(command);
        return ResponseEntity.created(
            URI.create("/api/v1/usuarios-musica/" + response.id()))
            .body(response);
    }

    // ... demais endpoints seguem o mesmo padrao
}
```

**Extracao do autor JWT:**
```java
private String extrairAutorDoJwt() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth instanceof JwtAuthenticationToken jwt) {
        var claims = jwt.getToken().getClaims();
        String username = (String) claims.get("preferred_username");
        return username != null ? username : (String) claims.get("sub");
    }
    return "sistema"; // fallback para testes sem auth
}
```

**GlobalExceptionHandler — handlers adicionais:**
```java
@ExceptionHandler(EntidadeNaoEncontradaException.class)
public ProblemDetail handleNotFound(EntidadeNaoEncontradaException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    pd.setTitle("Resource Not Found");
    pd.setType(URI.create("https://tools.ietf.org/html/rfc7231#section-6.5.4"));
    return pd;
}

@ExceptionHandler(CnpjDuplicadoException.class)
public ProblemDetail handleConflict(CnpjDuplicadoException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    pd.setTitle("Conflict");
    pd.setType(URI.create("https://tools.ietf.org/html/rfc7231#section-6.5.8"));
    return pd;
}

@ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
public ProblemDetail handleUnprocessable(RuntimeException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(
        HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    pd.setTitle("Unprocessable Entity");
    return pd;
}

@ExceptionHandler(MethodArgumentNotValidException.class)
public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(
        HttpStatus.BAD_REQUEST, "Um ou mais campos sao invalidos");
    pd.setTitle("Validation Error");
    // Adicionar campo "errors" com field+message de cada FieldError
    return pd;
}
```

**CorsConfig — adicionar metodos:**
Mudar `allowedMethods` de `GET, HEAD, OPTIONS` para `GET, HEAD, OPTIONS, POST, PUT, DELETE`.

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-api`
- [x] Todos os testes existentes continuam passando: `cd services/arrecadacao-api && mvn test`
- [x] Controller registra 7 endpoints no path /api/v1/usuarios-musica
- [x] GlobalExceptionHandler retorna ProblemDetail RFC 7807 para todos os cenarios de erro
- [x] CorsConfig permite POST e PUT
