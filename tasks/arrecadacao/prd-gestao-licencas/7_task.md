---
status: done
parallelizable: false
blocked_by: ["6.0"]
---

<task_context>
<domain>arrecadacao/tests</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: Testes de Integracao — persistencia e endpoints

## Relacionada as User Stories
- [HU-01] Criar Licenca (cobertura direta — endpoint POST + persistencia)
- [HU-02] Suspender Licenca (cobertura direta — endpoint + transicao de estado)
- [HU-03] Reativar Licenca (cobertura direta — endpoint + transicao de estado)
- [HU-04] Encerrar Licenca (cobertura direta — endpoint + transicao de estado)
- [HU-05] Visualizar historico (cobertura direta — endpoint GET historico)
- [HU-06] Listar licencas (cobertura direta — endpoint GET com filtros)
- [HU-07] Buscar licenca por ID (cobertura direta — endpoint GET por ID)

## Visao Geral

Implementar testes de integracao na camada `arrecadacao-tests` usando Testcontainers PostgreSQL e Spring Boot Test. `LicencaPersistenceIntegrationTest` valida as migrations V5+V6, operacoes de CRUD no banco real e o filtro `vigente` via Specification. `LicencaEndpointsIntegrationTest` valida os 7 endpoints HTTP com happy path e cenarios de erro, incluindo verificacao de seguranca para role consultor. Segue o padrao estabelecido por `RubricaPersistenceIntegrationTest`.

## Requisitos

**LicencaPersistenceIntegrationTest:**
- Flyway executou 6 migrations (V1 a V6)
- CRUD basico: criar e buscar licenca via JpaLicencaRepository
- FK constraint: inserir licenca com usuario inexistente falha
- FK constraint: inserir licenca com rubrica inexistente falha
- Persistencia de HistoricoStatusLicenca com FK para licenca existente
- Filtro `vigente=true` via LicencaSpecification retorna apenas licencas com dataFim nula ou futura
- Filtro `vigente=false` via LicencaSpecification retorna apenas licencas com dataFim passada

**LicencaEndpointsIntegrationTest:**
- POST /licencas (201): cria licenca, verifica response com usuarioMusica e rubrica expandidos
- GET /licencas (200): lista com paginacao, verifica campos da response
- GET /licencas?status=ATIVA (200): filtro por status
- GET /licencas?vigente=true (200): filtro por vigencia
- GET /licencas/{id} (200): busca por ID valido, verifica dados completos
- GET /licencas/{id} (404): UUID inexistente
- POST /licencas/{id}/suspender (200): licenca ATIVA → SUSPENSA, verifica status na response
- POST /licencas/{id}/reativar (200): licenca SUSPENSA → ATIVA
- POST /licencas/{id}/encerrar (200): licenca SUSPENSA → ENCERRADA
- POST /licencas/{id}/suspender (422): licenca ja SUSPENSA → erro de transicao invalida
- POST /licencas/{id}/encerrar (422): licenca ATIVA diretamente → erro "deve ser suspensa antes"
- POST /licencas (422): usuario INATIVO → erro de validacao de negocio
- POST /licencas (400): body invalido (usuarioMusicaId null) → erro de validacao Bean
- POST /licencas/{id}/suspender (400): justificativa com menos de 10 chars → erro de validacao
- POST /licencas (403): role consultor tentando criar → acesso negado
- GET /licencas/{id}/historico-status (200): lista historico em ordem DESC por data

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/infra/persistence/LicencaPersistenceIntegrationTest.java`
  - `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/api/LicencaEndpointsIntegrationTest.java`
- **Modificar:** Nenhum
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/infra/persistence/RubricaPersistenceIntegrationTest.java` (padrao Testcontainers + Flyway count)
  - `services/arrecadacao-api/arrecadacao-tests/pom.xml` (dependencias do modulo de testes)

## Subtarefas

- [ ] 7.1 Criar `LicencaPersistenceIntegrationTest` — Flyway count V1-V6
- [ ] 7.2 Adicionar cenarios CRUD de Licenca e HistoricoStatusLicenca
- [ ] 7.3 Adicionar cenarios de FK constraint (FK invalido falha)
- [ ] 7.4 Adicionar cenarios de Specification vigente=true e vigente=false
- [ ] 7.5 Criar `LicencaEndpointsIntegrationTest` — estrutura base com Testcontainers
- [ ] 7.6 Adicionar happy path dos 7 endpoints
- [ ] 7.7 Adicionar cenarios de erro (404, 422, 400)
- [ ] 7.8 Adicionar cenario de seguranca (consultor 403)

## Sequenciamento

- Bloqueado por: 6.0 (todos os endpoints implementados)
- Desbloqueia: 8.0 (frontend pode comecar apos backend validado)
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: todos os RFs de F03 (evidencia final de completude do backend)
- Evidencia esperada: todos os testes de integracao passam; `mvn test -pl arrecadacao-tests` verde

## Detalhes de Implementacao

**LicencaPersistenceIntegrationTest (estrutura e cenarios):**

```java
@SpringBootTest
@Testcontainers
@Transactional
class LicencaPersistenceIntegrationTest {

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
    @Autowired JpaLicencaRepository licencaRepository;
    @Autowired JpaHistoricoStatusLicencaRepository historicoRepository;
    @Autowired SpringDataUsuarioMusicaRepository usuarioMusicaSpringData;
    @Autowired SpringDataRubricaRepository rubricaSpringData;

    @Test
    void deveExecutarSeisMigrations() {
        var applied = flyway.info().applied();
        assertThat(applied).hasSize(6);
        // Verificar nomes: V1, V2, V3, V4, V5, V6
    }

    @Test
    void devePersistirEBuscarLicenca() {
        // Arrange: criar usuario e rubrica no banco
        // Act: Licenca.criar() + licencaRepository.save()
        // Assert: licencaRepository.findById() retorna a licenca
    }

    @Test
    void deveFalharComFkUsuarioInexistente() {
        // Tentar INSERT direto com UUID inexistente para usuario_musica_id
        // Espera DataIntegrityViolationException
    }

    @Test
    void devePersistirHistoricoComFkParaLicenca() {
        // Criar licenca + historico
        // Assert: historicoRepository.findByLicencaIdOrderByDataDesc() retorna historico
    }

    @Test
    void deveFiltrarLicencasVigentes() {
        // Criar 3 licencas:
        //   - dataFim null (vigente = true)
        //   - dataFim = futuro (vigente = true)
        //   - dataFim = passado (vigente = false)
        var spec = LicencaSpecification.comFiltros(null, null, null, null, Boolean.TRUE);
        var page = licencaRepository.findAll(spec, Pageable.unpaged());
        assertThat(page.getContent()).hasSize(2); // nao inclui a expirada
    }

    @Test
    void deveFiltrarLicencasExpiradas() {
        // Mesma fixture de 3 licencas
        var spec = LicencaSpecification.comFiltros(null, null, null, null, Boolean.FALSE);
        var page = licencaRepository.findAll(spec, Pageable.unpaged());
        assertThat(page.getContent()).hasSize(1); // apenas a expirada
    }
}
```

**LicencaEndpointsIntegrationTest (estrutura e cenarios):**

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@AutoConfigureMockMvc
class LicencaEndpointsIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        // configuracao identica ao teste de persistencia

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    // ---- Happy path ----

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveCrearLicencaERetornar201() throws Exception {
        // Arrange: inserir usuario ATIVO e rubrica no banco
        var request = new CriarLicencaRequest(usuarioId, rubricaId, LocalDate.now(), null);
        mockMvc.perform(post("/api/v1/licencas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(jsonPath("$.status").value("ATIVA"))
            .andExpect(jsonPath("$.usuarioMusica.id").value(usuarioId.toString()))
            .andExpect(jsonPath("$.rubrica.id").value(rubricaId.toString()));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveSuspenderLicencaAtiva() throws Exception {
        // Arrange: criar licenca ATIVA no banco
        var request = new TransicaoStatusRequest("Suspensao para auditoria interna");
        mockMvc.perform(post("/api/v1/licencas/{id}/suspender", licencaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SUSPENSA"));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveSuspenderReativarEEncerrarSequencialmente() throws Exception {
        // Full lifecycle: ATIVA → SUSPENSA → ATIVA → SUSPENSA → ENCERRADA
    }

    @Test
    @WithMockUser
    void deveBuscarLicencaPorId() throws Exception {
        mockMvc.perform(get("/api/v1/licencas/{id}", licencaId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(licencaId.toString()));
    }

    @Test
    @WithMockUser
    void deveListarHistoricoStatusEmOrdemDesc() throws Exception {
        // Criar licenca, suspender, reativar → 3 registros de historico
        mockMvc.perform(get("/api/v1/licencas/{id}/historico-status", licencaId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$[0].statusNovo").value("ATIVA"))  // mais recente primeiro
            .andExpect(jsonPath("$[2].statusAnterior").isNull());    // criacao inicial
    }

    // ---- Cenarios de erro ----

    @Test
    @WithMockUser
    void deveRetornar404ParaLicencaInexistente() throws Exception {
        mockMvc.perform(get("/api/v1/licencas/{id}", UUID.randomUUID()))
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422ParaTransicaoInvalida() throws Exception {
        // Licenca ja SUSPENSA, tentar suspender novamente
        var request = new TransicaoStatusRequest("Tentativa de suspensao duplicada");
        mockMvc.perform(post("/api/v1/licencas/{id}/suspender", licencaSuspensaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422AoEncerrarLicencaAtivadiretamente() throws Exception {
        // Licenca ATIVA, tentar encerrar sem suspender antes
        var request = new TransicaoStatusRequest("Encerrando sem suspender antes");
        mockMvc.perform(post("/api/v1/licencas/{id}/encerrar", licencaAtivaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.detail").value(
                org.hamcrest.Matchers.containsString("deve ser suspensa antes")));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422ParaUsuarioInativo() throws Exception {
        // Arrange: usuario INATIVO no banco
        var request = new CriarLicencaRequest(usuarioInativoId, rubricaId, LocalDate.now(), null);
        mockMvc.perform(post("/api/v1/licencas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar400ParaRequestInvalido() throws Exception {
        // usuarioMusicaId null
        var body = "{\"rubricaId\":\"" + rubricaId + "\",\"dataInicio\":\"2026-04-05\"}";
        mockMvc.perform(post("/api/v1/licencas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar400ParaJustificativaCurta() throws Exception {
        var body = "{\"justificativa\":\"curta\"}";  // menos de 10 chars
        mockMvc.perform(post("/api/v1/licencas/{id}/suspender", licencaAtivaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    // ---- Seguranca ----

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void deveRetornar403ParaConsultorAoCriarLicenca() throws Exception {
        var request = new CriarLicencaRequest(usuarioId, rubricaId, LocalDate.now(), null);
        mockMvc.perform(post("/api/v1/licencas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

    @Test
    void deveRetornar401SemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/v1/licencas"))
            .andExpect(status().isUnauthorized());
    }
}
```

## Criterios de Sucesso (Verificaveis)

- [ ] Testes de integracao passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-tests`
- [ ] `LicencaPersistenceIntegrationTest` — Flyway conta 6 migrations (V1-V6)
- [ ] `LicencaPersistenceIntegrationTest` — filtro vigente=true retorna 2 de 3 licencas
- [ ] `LicencaPersistenceIntegrationTest` — filtro vigente=false retorna 1 de 3 licencas
- [ ] `LicencaEndpointsIntegrationTest` — POST /licencas retorna 201 com response expandida
- [ ] `LicencaEndpointsIntegrationTest` — ciclo completo ATIVA→SUSPENSA→ATIVA→SUSPENSA→ENCERRADA sem erros
- [ ] `LicencaEndpointsIntegrationTest` — encerrar ATIVA retorna 422 com mensagem "deve ser suspensa antes"
- [ ] `LicencaEndpointsIntegrationTest` — usuario INATIVO retorna 422
- [ ] `LicencaEndpointsIntegrationTest` — consultor retorna 403 ao tentar criar licenca
- [ ] `LicencaEndpointsIntegrationTest` — sem autenticacao retorna 401
- [ ] Testes existentes continuam passando: `RubricaPersistenceIntegrationTest` e outros
