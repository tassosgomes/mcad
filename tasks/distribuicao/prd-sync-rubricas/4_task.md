---
status: completed
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>distribuicao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 4.0: Application + API — queries, controller, security e error handler

## Relacionada às User Stories

- [HU-02] Consultar rubricas disponíveis (cobertura direta)
- [HU-03] Selecionar rubrica ao criar processo (suporte — endpoint pronto)

## Visão Geral

Implementar a camada de application (queries CQRS + DTOs) e a camada de API (controller REST read-only, Spring Security OAuth2 e GlobalExceptionHandler com RFC 7807).

## Requisitos

- `GET /api/v1/rubricas` retorna array de rubricas (200) ou array vazio (200)
- `GET /api/v1/rubricas/{sigla}` retorna rubrica (200) ou 404
- POST/PUT/PATCH/DELETE retornam 405
- Sem JWT válido retorna 401
- Erros no formato ProblemDetails (RFC 7807)
- CQRS: queries e handlers separados na camada application

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/dto/RubricaResponse.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/ListarRubricasQuery.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/BuscarRubricaPorSiglaQuery.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/handlers/ListarRubricasQueryHandler.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/handlers/BuscarRubricaPorSiglaQueryHandler.java`
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/RubricaController.java`
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/config/SecurityConfig.java`
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/config/GlobalExceptionHandler.java`
- **Referência:**
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/PagamentoController.java` (padrão de controller)
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/SecurityConfig.java` (padrão OAuth2)
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/GlobalExceptionHandler.java` (padrão RFC 7807)
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/RubricaResumoResponse.java` (padrão DTO)
  - `tasks/distribuicao/prd-sync-rubricas/api-contract.yaml` (contrato de API)
- **Skills para consultar durante implementação:**
  - `java-architecture` — CQRS queries/handlers
  - `java-code-quality` — records para DTOs
  - `common-restful-api` — RFC 7807, HTTP status codes

## Subtarefas

- [ ] 4.1 Criar `RubricaResponse.java` (record com id, sigla, nome, exigeClassificacao + factory `from(Rubrica)`)
- [ ] 4.2 Criar queries e handlers CQRS: `ListarRubricasQuery` + handler, `BuscarRubricaPorSiglaQuery` + handler
- [ ] 4.3 Criar `RubricaController.java` com `GET /api/v1/rubricas` e `GET /api/v1/rubricas/{sigla}`
- [ ] 4.4 Criar `SecurityConfig.java` com OAuth2 Resource Server, toggle AUTH_ENABLED, roles
- [ ] 4.5 Criar `GlobalExceptionHandler.java` com ProblemDetails (404, 405, 500)
- [ ] 4.6 Verificar que o projeto compila

## Sequenciamento

- Bloqueado por: 2.0 (precisa do domain layer)
- Desbloqueia: 6.0
- Paralelizável: Sim, com 3.0 (ambos dependem de 2.0 mas não entre si)

## Rastreabilidade

- Esta tarefa cobre: RF-06, RF-07, RF-08
- Evidência esperada: endpoints respondem conforme api-contract.yaml

## Detalhes de Implementação

**RubricaResponse.java:**
```java
public record RubricaResponse(
    UUID id,
    String sigla,
    String nome,
    boolean exigeClassificacao
) {
    public static RubricaResponse from(Rubrica entity) {
        return new RubricaResponse(
            entity.getId(),
            entity.getSigla(),
            entity.getNome(),
            entity.isExigeClassificacao()
        );
    }
}
```

**RubricaController.java:**
```java
@RestController
@RequestMapping("/api/v1/rubricas")
public class RubricaController {

    private final ListarRubricasQueryHandler listarHandler;
    private final BuscarRubricaPorSiglaQueryHandler buscarHandler;

    @GetMapping
    public ResponseEntity<List<RubricaResponse>> listar() {
        return ResponseEntity.ok(listarHandler.handle(new ListarRubricasQuery()));
    }

    @GetMapping("/{sigla}")
    public ResponseEntity<RubricaResponse> buscarPorSigla(@PathVariable String sigla) {
        return ResponseEntity.ok(buscarHandler.handle(new BuscarRubricaPorSiglaQuery(sigla)));
    }
}
```

**SecurityConfig.java — toggle AUTH_ENABLED (mesmo padrão arrecadação):**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.auth.enabled:false}")
    private boolean authEnabled;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        if (!authEnabled) {
            return http.csrf(c -> c.disable())
                .authorizeHttpRequests(a -> a.anyRequest().permitAll())
                .build();
        }
        return http.csrf(c -> c.disable())
            .authorizeHttpRequests(a -> a
                .requestMatchers("/actuator/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
            .build();
    }
}
```

**GlobalExceptionHandler.java:**
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail handleNotFound(NotFoundException ex, HttpServletRequest request) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource Not Found");
        problem.setInstance(URI.create(request.getRequestURI()));
        return problem;
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ProblemDetail handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.METHOD_NOT_ALLOWED,
            "Rubricas são dados sincronizados da Arrecadação e não podem ser modificados localmente");
        problem.setTitle("Method Not Allowed");
        problem.setInstance(URI.create(request.getRequestURI()));
        return problem;
    }
}
```

**Convenções da stack:**
- Records para DTOs (imutáveis, sem builder)
- Factory method `from(Entity)` para conversão
- CQRS: queries são records simples, handlers são `@Service`
- `ProblemDetail` nativo do Spring (RFC 7807, sem lib externa)
- Controller delega para handlers, sem lógica de negócio

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/distribuicao-api && mvn compile`
- [ ] `GET /api/v1/rubricas` retorna `[]` (200) quando não há dados
- [ ] `GET /api/v1/rubricas/TV_ABERTA` retorna 200 com rubrica (quando existe)
- [ ] `GET /api/v1/rubricas/INEXISTENTE` retorna 404 ProblemDetail
- [ ] `POST /api/v1/rubricas` retorna 405 ProblemDetail
- [ ] Sem Authorization header retorna 401 (quando AUTH_ENABLED=true)
