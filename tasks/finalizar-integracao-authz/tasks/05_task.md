---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/arrecadacao-api</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database,http_server,temporal</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 5.0: Arrecadacao API (Java) — ampliar Testcontainers + `AuthzPermissionEnforcementTest` cobrindo CT-ARR-R01..R07

## Relacionada às User Stories

- US-01, US-03 — cobertura direta
- Endereça gap G5 do plano aprovado (Testcontainers ampla)

## Visão Geral

Hoje `AuthzPermissionEnforcementTest.java` cobre 4 testes (unit/slice). O `relatorio-final.md §3` reconhece falta de integração com Testcontainers cobrindo TODOS os controllers anotados (`LicencaController`, `PagamentoController`, `VerbaController`, `RubricaController`). Esta task fecha esse gap.

## Requisitos

- Ampliar a suíte com 4 controllers × cenários (consultor lê, analista escreve, sem-papel = 403) usando Testcontainers (PostgreSQL real, não H2)
- CT-ARR-R07: starter auto-registra catálogo no boot — usar WireMock para capturar POST `/v1/permission-catalog/register` e validar 17 chaves
- Manter os 4 testes atuais verdes
- Cobertura deve usar JWT real (issuer mockado via `jwt-decoder`) — sem mock direto de `AuthzDecisionClient` no nível de integração

## Arquivos Envolvidos

- **Modificar:**
  - `mcad/services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/authz/AuthzPermissionEnforcementTest.java` (ampliar)
- **Criar:**
  - `mcad/services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/authz/LicencaAuthzIntegrationTest.java`
  - `mcad/services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/authz/PagamentoAuthzIntegrationTest.java`
  - `mcad/services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/authz/VerbaAuthzIntegrationTest.java`
  - `mcad/services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/authz/RubricaAuthzIntegrationTest.java`
  - `mcad/services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/authz/CatalogRegistrationIT.java` — CT-ARR-R07
  - `mcad/services/arrecadacao-api/arrecadacao-tests/src/test/resources/wiremock/decision-allow.json` (mappings WireMock)
  - `mcad/services/arrecadacao-api/arrecadacao-tests/src/test/resources/wiremock/decision-deny.json`
- **Referência:**
  - `mcad/services/arrecadacao-api/arrecadacao-api/src/main/resources/permissions.yaml` (17 chaves esperadas)
  - `mcad/services/arrecadacao-api/arrecadacao-api/src/main/resources/application.yml` (linhas 64-76 — config catalog)
  - `mcad/services/arrecadacao-api/arrecadacao-api/src/main/java/.../controllers/{Licenca,Pagamento,Verba,Rubrica}Controller.java`
  - `ecad-authz/backend/sdk/authz-spring-boot-starter/` (implementação do starter)
- **Skills para consultar durante implementação:**
  - `java-testing` — JUnit 5 + AssertJ, Testcontainers (Postgres), `@SpringBootTest`
  - `java-code-quality` — exception handling, logging, sem `printStackTrace`
  - `java-architecture` — estrutura `*Test.java` vs `*IT.java`
  - `common-restful-api` — `ErrorResponse`

## Subtarefas

- [ ] 5.1 Definir mock HTTP (WireMock) para `/v1/authz/decisions` e `/v1/permission-catalog/register`; configurar `ecad.authz.base-url` para apontar para o servidor WireMock
- [ ] 5.2 Implementar `LicencaAuthzIntegrationTest` com 3 cenários × ≥ 3 endpoints (`GET /api/v1/licencas`, `POST /api/v1/licencas`, etc.)
- [ ] 5.3 Implementar `PagamentoAuthzIntegrationTest` idem
- [ ] 5.4 Implementar `VerbaAuthzIntegrationTest` idem
- [ ] 5.5 Implementar `RubricaAuthzIntegrationTest` idem
- [ ] 5.6 Implementar `CatalogRegistrationIT` — boot do app + WireMock recebe POST com 17 chaves
- [ ] 5.7 Ajustar `application-test.yml` se necessário para apontar para WireMock dinâmico
- [ ] 5.8 Workaround Testcontainers WSL2 conforme `MEMORY.md` (proxy Python + DOCKER_HOST)

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 8.0
- Paralelizável: Sim

## Rastreabilidade

- Cobre: US-01, US-03; endereça G5
- Evidência: `mvn -pl arrecadacao-tests test -Dtest="*AuthzIntegrationTest,CatalogRegistrationIT"` ≥ 12 cenários verdes

## Detalhes de Implementação

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class LicencaAuthzIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    static WireMockServer authzMock = new WireMockServer(0);

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("ecad.authz.base-url", () -> "http://localhost:" + authzMock.port());
    }

    @Test
    void getLicencas_whenJwtMissing_returns401() { /* ... */ }

    @Test
    void getLicencas_whenPermissionDenied_returns403() {
        authzMock.stubFor(post("/v1/authz/decisions")
            .willReturn(okJson("""
                {"allowed": false, "reason": "PERMISSION_DENIED"}
                """)));
        // act + assert
    }

    @Test
    void getLicencas_whenPermitted_returns200() {
        authzMock.stubFor(post("/v1/authz/decisions")
            .willReturn(okJson("""{"allowed": true}""")));
        // act + assert
    }
}
```

**Convenções da stack:**
- `java-testing`: nome de classe termina em `IT` para tests de integração (executados por failsafe) ou `Test` para slice; usar `*IT` aqui
- `java-code-quality`: `var` permitido para tipos locais; `AssertJ` em vez de `assertEquals`
- WireMock vs `MockServer`: usar WireMock (já familiar ao time)

**Importante (WSL2 + Docker Desktop):** Conforme `ecad-authz/tasks/.../MEMORY.md`, há workaround para Testcontainers em WSL2 com Docker Desktop 29.4.0 — se rodar localmente, aplicar.

## Critérios de Sucesso (Verificáveis)

- [ ] Testes passam: `cd mcad/services/arrecadacao-api && mvn -pl arrecadacao-tests test -Dtest="*AuthzIntegrationTest"`
- [ ] CT-ARR-R07: `mvn -pl arrecadacao-tests test -Dtest=CatalogRegistrationIT`
- [ ] Build: `cd mcad/services/arrecadacao-api && mvn -pl arrecadacao-api -am compile`
- [ ] Total módulo arrecadacao-tests mantém-se verde: `mvn -pl arrecadacao-tests test` (cuidado: já há erros conhecidos por ausência de Docker — não regredir o que já passa)
- [ ] Spotless: `mvn spotless:apply` e commitar formato consistente
