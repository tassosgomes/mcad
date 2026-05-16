---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/distribuicao-api</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database,http_server</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 6.0: Distribuicao API (Java) — completar `AuthzPermissionEnforcementTest` cobrindo CT-DIS-R01..R05

## Relacionada às User Stories

- US-01, US-03 — cobertura direta

## Visão Geral

`distribuicao-api` foi criada em F02 (commits `f08471e`, `59c042e`, `0fb21c0`) e já tem `AuthzPermissionEnforcementTest.java`. Esta task valida que cobre os 8 endpoints do `ProcessoController` (CRUD + `/calcular`) e adiciona CT-DIS-R05 (catalog registration com 9 chaves `distribuicao:default:*`).

## Requisitos

- Confirmar/adicionar cobertura para 8 endpoints × 3 estados
- CT-DIS-R05: WireMock recebe POST `/v1/permission-catalog/register` com 9 chaves no boot
- Padrão idêntico ao Task 5.0 (WireMock + Testcontainers Postgres)

## Arquivos Envolvidos

- **Modificar:**
  - `mcad/services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/authz/AuthzPermissionEnforcementTest.java` (ampliar se necessário)
- **Criar:**
  - `mcad/services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/authz/ProcessoControllerAuthzIntegrationTest.java`
  - `mcad/services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/authz/CatalogRegistrationIT.java`
- **Referência:**
  - `mcad/services/distribuicao-api/distribuicao-api/src/main/resources/permissions.yaml` (9 chaves esperadas)
  - `mcad/services/distribuicao-api/distribuicao-api/src/main/resources/application.yml:97` (config catalog)
  - `mcad/services/distribuicao-api/distribuicao-api/src/main/java/.../controllers/ProcessoController.java`
- **Skills para consultar durante implementação:**
  - `java-testing`, `java-code-quality`, `common-restful-api`

## Subtarefas

- [ ] 6.1 Inspecionar `AuthzPermissionEnforcementTest.java` atual; listar endpoints já cobertos vs faltantes
- [ ] 6.2 Implementar `ProcessoControllerAuthzIntegrationTest` com 3 cenários × 8 endpoints (listar, visualizar, criar, atualizar, deletar, calcular, e 2 outros do controller)
- [ ] 6.3 Implementar `CatalogRegistrationIT` validando 9 chaves
- [ ] 6.4 Reusar pattern WireMock do Task 5.0 (se ambas tasks rodarem no mesmo PR, considerar extrair lib `Mcad.Test.Authz.Common` no commit)

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 8.0
- Paralelizável: Sim

## Rastreabilidade

- Cobre: US-01, US-03
- Evidência: `mvn -pl distribuicao-tests test -Dtest="*AuthzIntegrationTest,CatalogRegistrationIT"` ≥ 9 cenários

## Detalhes de Implementação

Mesmo padrão da Task 5.0 (WireMock + Testcontainers + DynamicPropertySource). Diferença: 9 chaves esperadas em vez de 17, e endpoints CRUD do `ProcessoController` mais o `/calcular`.

```java
@Test
void calcularProcesso_whenAnalistaTemPermissao_returns200() {
    authzMock.stubFor(post("/v1/authz/decisions")
        .withRequestBody(matchingJsonPath("$.permission",
            equalTo("distribuicao:default:processo:calcular")))
        .willReturn(okJson("""{"allowed": true}""")));
    // POST /api/v1/processos/{id}/calcular → 200
}
```

**Convenções da stack:** mesmas da Task 5.0.

**Workaround WSL2:** mesmo.

## Critérios de Sucesso (Verificáveis)

- [ ] Testes passam: `cd mcad/services/distribuicao-api && mvn -pl distribuicao-tests test -Dtest="*AuthzIntegrationTest"`
- [ ] CT-DIS-R05: `mvn -pl distribuicao-tests test -Dtest=CatalogRegistrationIT`
- [ ] Build: `cd mcad/services/distribuicao-api && mvn -am compile`
- [ ] Spotless verde
