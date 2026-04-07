---
status: pending
parallelizable: false
blocked_by: ["6.0"]
---

<task_context>
<domain>arrecadacao/tests</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: Testes de integracao — persistencia + endpoints UDA + endpoints Pagamento

## Relacionada as User Stories

- [HU-01] Ajustar valor UDA (cobertura direta — POST /uda + persistencia)
- [HU-02] Consultar historico UDA (cobertura direta — GET /uda/historico)
- [HU-03] Registrar pagamento (cobertura direta — POST /pagamentos + persistencia)
- [HU-04] Consultar pagamentos (cobertura direta — GET /pagamentos com filtros)
- [HU-05] Visualizar detalhes pagamento (cobertura direta — GET /pagamentos/{id})
- [HU-06] Consultar UDA vigente (cobertura direta — GET /uda/vigente)

## Visao Geral

Implementar testes de integracao na camada `arrecadacao-tests` usando Testcontainers PostgreSQL e Spring Boot Test. Tres classes: `PagamentoPersistenceIntegrationTest` (Flyway V1-V8, CRUD, partial unique, Specification), `UdaEndpointsIntegrationTest` (3 endpoints UDA) e `PagamentoEndpointsIntegrationTest` (3 endpoints Pagamento com todos os cenarios de erro).

## Requisitos

**PagamentoPersistenceIntegrationTest:**
- Flyway executou 8 migrations (V1 a V8)
- Seed UDA R$ 107,31 presente
- CRUD basico: criar e buscar UdaValor e Pagamento
- Partial unique constraint: segundo CONFIRMADO para mesma licenca+periodo falha
- Specification filters: por periodo, por status, por razaoSocial (join)

**UdaEndpointsIntegrationTest:**
- GET /uda/vigente (200): retorna seed R$ 107,31
- GET /uda/vigente (404): sem UDA vigente (seed removido ou data futura)
- POST /uda (201): cria novo valor, verifica response
- POST /uda (400): valor <= 0
- POST /uda (403): consultor tentando ajustar
- GET /uda/historico (200): lista com seed + novos registros, ordenados DESC

**PagamentoEndpointsIntegrationTest:**
- POST /pagamentos (201): registra pagamento, verifica valorBruto calculado
- POST /pagamentos (404): licenca inexistente
- POST /pagamentos (409): segundo CONFIRMADO no mesmo periodo
- POST /pagamentos (422): licenca ENCERRADA
- POST /pagamentos (422): sem UDA vigente
- GET /pagamentos (200): lista com paginacao e filtros
- GET /pagamentos/{id} (200): detalhes com licenca expandida
- GET /pagamentos/{id} (404): UUID inexistente
- POST /pagamentos (403): consultor

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/infra/persistence/PagamentoPersistenceIntegrationTest.java`
  - `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/api/UdaEndpointsIntegrationTest.java`
  - `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/api/PagamentoEndpointsIntegrationTest.java`
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/infra/persistence/LicencaPersistenceIntegrationTest.java` (padrao Testcontainers)
  - `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/api/LicencaEndpointsIntegrationTest.java` (padrao endpoints)
  - `services/arrecadacao-api/arrecadacao-tests/pom.xml`
- **Skills para consultar durante implementacao:**
  - `java-testing` — Testcontainers PostgreSQL, Spring Boot Test, MockMvc, AAA pattern
  - `java-architecture` — @Transactional em testes, Flyway count

## Subtarefas

- [ ] 7.1 Criar `PagamentoPersistenceIntegrationTest` — Flyway count V1-V8
- [ ] 7.2 Adicionar cenario seed UDA R$ 107,31 presente
- [ ] 7.3 Adicionar cenarios CRUD UdaValor e Pagamento
- [ ] 7.4 Adicionar cenario partial unique constraint (segundo CONFIRMADO falha)
- [ ] 7.5 Adicionar cenarios Specification (periodo, status, razaoSocial join)
- [ ] 7.6 Criar `UdaEndpointsIntegrationTest` — happy paths e erros
- [ ] 7.7 Criar `PagamentoEndpointsIntegrationTest` — happy paths
- [ ] 7.8 Adicionar cenarios de erro (404, 409, 422 encerrada, 422 sem UDA)
- [ ] 7.9 Adicionar cenario de seguranca (consultor 403)

## Sequenciamento

- Bloqueado por: 6.0 (todos os endpoints implementados)
- Desbloqueia: 8.0 (frontend pode comecar apos backend validado)
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: todos os RFs de F04 (evidencia final de completude do backend)
- Evidencia esperada: todos os testes de integracao passam

## Detalhes de Implementacao

**PagamentoPersistenceIntegrationTest:**

```java
@SpringBootTest
@Testcontainers
@Transactional
class PagamentoPersistenceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("arrecadacao_test")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired Flyway flyway;
    @Autowired JpaUdaValorRepository udaValorRepository;
    @Autowired JpaPagamentoRepository pagamentoRepository;

    @Test
    void deveExecutarOitoMigrations() {
        var applied = flyway.info().applied();
        assertThat(applied).hasSize(8);
    }

    @Test
    void deveTerSeedUdaComValor107_31() {
        var uda = udaValorRepository.findVigente(LocalDate.of(2026, 4, 1));
        assertThat(uda).isPresent();
        assertThat(uda.get().getValor()).isEqualByComparingTo("107.310000");
    }

    @Test
    void deveRejeitarSegundoPagamentoConfirmadoParaMesmaLicencaEPeriodo() {
        // Arrange: criar licenca, registrar primeiro pagamento CONFIRMADO
        // Act: tentar registrar segundo no mesmo periodo
        // Assert: DataIntegrityViolationException (partial unique)
    }

    @Test
    void deveFiltrarPagamentosPorPeriodoViaSpecification() {
        // Arrange: criar pagamentos em periodos diferentes
        var spec = PagamentoSpecification.comFiltros(null, null, null, "2026-04", null);
        var page = pagamentoRepository.findAll(spec, Pageable.unpaged());
        assertThat(page.getContent()).hasSize(1);
    }
}
```

**UdaEndpointsIntegrationTest:**

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@AutoConfigureMockMvc
class UdaEndpointsIntegrationTest {

    @Test
    @WithMockUser
    void deveRetornarUdaVigenteSeed() throws Exception {
        mockMvc.perform(get("/api/v1/uda/vigente"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valor").value("107.310000"))
            .andExpect(jsonPath("$.dataVigencia").value("2026-01-01"));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveCriarNovoValorUda() throws Exception {
        var body = "{\"valor\":\"110.50\",\"dataVigencia\":\"2026-05-01\"}";
        mockMvc.perform(post("/api/v1/uda")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.valor").value("110.500000"));
    }

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void deveRetornar403ParaConsultorAoAjustarUda() throws Exception {
        var body = "{\"valor\":\"110.50\",\"dataVigencia\":\"2026-05-01\"}";
        mockMvc.perform(post("/api/v1/uda")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void deveListarHistoricoUda() throws Exception {
        mockMvc.perform(get("/api/v1/uda/historico"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$[0].dataVigencia").exists());
    }
}
```

**PagamentoEndpointsIntegrationTest:**

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@AutoConfigureMockMvc
class PagamentoEndpointsIntegrationTest {

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRegistrarPagamentoERetornar201() throws Exception {
        // Arrange: criar licenca ATIVA no banco (pre-requisito F03)
        var body = "{\"licencaId\":\"" + licencaId + "\",\"quantidadeUdas\":\"5.5\"}";
        mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.valorBruto").exists())
            .andExpect(jsonPath("$.status").value("CONFIRMADO"))
            .andExpect(jsonPath("$.licenca.id").value(licencaId.toString()));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar409ParaPagamentoDuplicado() throws Exception {
        // Registrar primeiro, tentar segundo no mesmo periodo
        mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422ParaLicencaEncerrada() throws Exception {
        // Licenca ENCERRADA
        mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @WithMockUser
    void deveBuscarPagamentoPorId() throws Exception {
        mockMvc.perform(get("/api/v1/pagamentos/{id}", pagamentoId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(pagamentoId.toString()))
            .andExpect(jsonPath("$.licenca.usuarioMusica.razaoSocial").exists());
    }

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void deveRetornar403ParaConsultorAoRegistrar() throws Exception {
        mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }
}
```

**Convencoes da stack:**
- Testcontainers PostgreSQL para ambiente isolado
- @Transactional nos testes de persistencia (rollback automatico)
- MockMvc para testes de endpoint
- @WithMockUser para simular autenticacao
- AAA pattern, naming convention `methodName_Condition_ExpectedBehavior`

## Criterios de Sucesso (Verificaveis)

- [ ] Testes passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-tests`
- [ ] `PagamentoPersistenceIntegrationTest` — Flyway conta 8 migrations (V1-V8)
- [ ] `PagamentoPersistenceIntegrationTest` — seed UDA presente com valor 107.310000
- [ ] `PagamentoPersistenceIntegrationTest` — partial unique constraint rejeita duplicado
- [ ] `UdaEndpointsIntegrationTest` — GET /uda/vigente retorna 200 com seed
- [ ] `UdaEndpointsIntegrationTest` — POST /uda retorna 201, consultor retorna 403
- [ ] `PagamentoEndpointsIntegrationTest` — POST /pagamentos retorna 201 com valorBruto calculado
- [ ] `PagamentoEndpointsIntegrationTest` — 409 duplicado, 422 encerrada, 404 licenca
- [ ] `PagamentoEndpointsIntegrationTest` — consultor 403
- [ ] Testes existentes continuam passando (F01/F02/F03)
