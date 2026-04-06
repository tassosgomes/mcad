---
status: completed
parallelizable: false
blocked_by: ["6.0"]
---

<task_context>
<domain>arrecadacao/tests</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 7.0: Testes de integracao (persistence + endpoints)

## Relacionada as User Stories

- [HU-01] Cadastrar (verificacao end-to-end)
- [HU-03] Editar (verificacao end-to-end)
- [HU-04] Inativar (verificacao end-to-end)
- [HU-05] Reativar (verificacao end-to-end)
- [HU-06] Consultar (verificacao end-to-end)
- [HU-07] Historico (verificacao end-to-end)

## Visao Geral

Implementar testes de integracao usando Spring Boot Test + Testcontainers PostgreSQL. Dois conjuntos: (1) UsuarioMusicaPersistenceIntegrationTest — CRUD via repositorios com banco real, verificacao de constraints e Flyway; (2) UsuarioMusicaEndpointsIntegrationTest — todos os 7 endpoints HTTP com MockMvc, incluindo cenarios de erro e seguranca.

## Requisitos

- Testcontainers PostgreSQL 16-alpine
- Flyway migration verification (espera V1-V4)
- CRUD completo via repositorios
- Constraint UNIQUE cnpj verificada
- Specification filters testados com dados reais
- Todos os 7 endpoints HTTP via MockMvc ou WebTestClient
- Cenarios de erro: 400, 404, 409, 422
- Seguranca: consultor nao pode criar/editar/inativar (403)
- Auth desabilitada para persistence tests, mockada para endpoint tests

## Arquivos Envolvidos

- **Criar:**
  - `arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/infra/persistence/UsuarioMusicaPersistenceIntegrationTest.java`
  - `arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/api/UsuarioMusicaEndpointsIntegrationTest.java`
- **Referencia:**
  - `arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/infra/persistence/RubricaPersistenceIntegrationTest.java` (padrao Testcontainers)
  - `tasks/arrecadacao/prd-gestao-usuarios-musica/api-contract.yaml` (contratos de request/response)
  - `tasks/arrecadacao/prd-gestao-usuarios-musica/api-contract.md` (exemplos JSON)
- **Skills para consultar:**
  - `java-testing` — Testcontainers, @SpringBootTest, MockMvc, naming
  - `java-architecture` — integracao end-to-end

## Subtarefas

- [x] 7.1 UsuarioMusicaPersistenceIntegrationTest: Flyway count, CRUD, UNIQUE cnpj, Specification
- [x] 7.2 UsuarioMusicaEndpointsIntegrationTest: happy path para os 7 endpoints
- [x] 7.3 UsuarioMusicaEndpointsIntegrationTest: cenarios de erro (400, 404, 409, 422)
- [x] 7.4 UsuarioMusicaEndpointsIntegrationTest: seguranca (consultor 403 em escrita)
- [x] 7.5 Verificar que todos os testes existentes (F01) continuam passando

## Sequenciamento

- Bloqueado por: 6.0
- Desbloqueia: Nenhum (ultima task)
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01 a RF-07, RF-11 a RF-14, RF-16 a RF-19 (verificacao end-to-end)
- Evidencia esperada: todos os testes passam com Testcontainers; contratos respeitados

## Detalhes de Implementacao

**UsuarioMusicaPersistenceIntegrationTest:**
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Testcontainers
@TestPropertySource(properties = {"app.security.auth-enabled=false"})
class UsuarioMusicaPersistenceIntegrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("mcad_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> postgres.getJdbcUrl() + "?currentSchema=arrecadacao");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.schemas", () -> "arrecadacao");
    }

    @Autowired private UsuarioMusicaRepository repository;
    @Autowired private HistoricoStatusUsuarioRepository historicoRepository;

    @Test
    void deveRodar4Migrations() { /* verify Flyway applied V1-V4 */ }

    @Test
    void devePersistirUsuarioComCnpjValido() {
        // Arrange: criar entity com dados validos
        // Act: repository.save()
        // Assert: findById retorna entity com todos os campos
    }

    @Test
    void deveRejeitarCnpjDuplicadoViaConstraint() {
        // Arrange: salvar 2 entities com mesmo CNPJ
        // Assert: DataIntegrityViolationException
    }

    @Test
    void deveFiltrarPorRazaoSocialParcial() {
        // Arrange: salvar "Radio Cidade FM" e "TV Globo"
        // Act: findAll com Specification razaoSocial="radio"
        // Assert: retorna apenas Radio
    }

    @Test
    void deveFiltrarPorStatus() {
        // Arrange: salvar ATIVO e INATIVO
        // Act: findAll com Specification status=ATIVO
        // Assert: retorna apenas ATIVO
    }

    @Test
    void devePersistirHistoricoDeStatus() {
        // Arrange: salvar usuario, salvar 2 registros de historico
        // Act: findByUsuarioMusicaIdOrderByDataDesc
        // Assert: retorna 2 registros, mais recente primeiro
    }
}
```

**UsuarioMusicaEndpointsIntegrationTest:**
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@AutoConfigureMockMvc
class UsuarioMusicaEndpointsIntegrationTest {
    @Autowired private MockMvc mockMvc;

    // POST /api/v1/usuarios-musica → 201
    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveCriarUsuarioComSucesso() {
        mockMvc.perform(post("/api/v1/usuarios-musica")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "razaoSocial": "Radio Cidade FM Ltda",
                      "cnpj": "50997063000132",
                      "endereco": { "cep": "01001000", "logradouro": "Praca da Se", "numero": "1000", "bairro": "Se", "cidade": "Sao Paulo", "uf": "SP" },
                      "contato": { "nomeResponsavel": "Joao Silva" }
                    }
                    """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ATIVO"))
                .andExpect(jsonPath("$.cnpjFormatado").value("50.997.063/0001-32"));
    }

    // POST → 409 CNPJ duplicado
    // POST → 422 CNPJ invalido
    // POST → 400 razaoSocial < 3 chars
    // GET /api/v1/usuarios-musica → 200 com paginacao
    // GET /api/v1/usuarios-musica/{id} → 200
    // GET /api/v1/usuarios-musica/{id} → 404
    // PUT /api/v1/usuarios-musica/{id} → 200
    // POST /api/v1/usuarios-musica/{id}/inativar → 200
    // POST /api/v1/usuarios-musica/{id}/inativar → 422 (ja inativo)
    // POST /api/v1/usuarios-musica/{id}/ativar → 200
    // GET /api/v1/usuarios-musica/{id}/historico-status → 200

    // Seguranca: consultor tenta POST → 403
    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void consultorNaoDeveCriar() {
        mockMvc.perform(post("/api/v1/usuarios-musica")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isForbidden());
    }
}
```

**Convencoes da stack (java-testing):**
- Naming: `deve[Acao][Cenario]` (ex: `deveCriarUsuarioComSucesso`, `deveRejeitarCnpjDuplicado`)
- Padrao AAA: Arrange-Act-Assert
- Testcontainers: PostgreSQL 16-alpine, shared container via @Container static
- @DynamicPropertySource para config do banco
- @WithMockUser para simular roles JWT
- AssertJ para assertions fluentes

## Criterios de Sucesso (Verificaveis)

- [x] Testes passam: `cd services/arrecadacao-api && mvn verify -pl arrecadacao-tests`
- [x] Persistence tests: CRUD completo, UNIQUE constraint, Specification filters
- [x] Endpoint tests: 7 endpoints happy path + cenarios de erro (400, 404, 409, 422)
- [x] Security tests: consultor recebe 403 em endpoints de escrita
- [x] Testes F01 existentes continuam passando: `cd services/arrecadacao-api && mvn verify`
- [x] Zero testes ignorados ou skipped
