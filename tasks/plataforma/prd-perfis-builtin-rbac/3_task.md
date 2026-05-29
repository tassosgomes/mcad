---
status: blocked
parallelizable: true
blocked_by: [1.0]
---

<task_context>
<domain>engine/backend/distribuicao/tests</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>java,spring-boot,testcontainers,wiremock</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 3.0: Ampliar matriz de testes de authorization enforcement em Distribuição (Java)

## Relacionada às User Stories

- [US-01] Diretor de Governança (irreversíveis só Gerente) — cobertura direta
- [US-02] Analista de Distribuição (operar sem aprovação) — cobertura direta

## Visão Geral

O backend Java de Distribuição **não recebe código novo** nesta entrega — o refactor é puramente de catálogo. Mas a matriz de testes precisa ser ampliada para cobrir os 4 perfis novos (Consultor, Operador, Gerente, Analista) × 9 endpoints × 3 estados (sem JWT, com JWT sem permissão, com JWT e permissão). Isso garante regressão real do framework e produz evidência de que o catálogo está correto.

A suíte existente (`AuthzPermissionEnforcementTest.java`) já tem o esqueleto com WireMock; falta expandir cenários.

## Requisitos

- Cobrir os 9 endpoints existentes em `ProcessoController` + `ProcessoCalculoController` + `RubricaController`.
- 4 perfis × 3 estados por endpoint = 108 cenários (alguns podem ser parametrizados).
- Validar especificamente: `recalcular-pos-calculado` (Analista) bloqueado para Operador/Gerente — neste momento não há endpoint dedicado, então o teste apenas valida que a permissão **só** vem no perfil correto.
- Não há código de produção novo nesta tarefa; só testes.

## Arquivos Envolvidos

- **Modificar:**
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/AuthzPermissionEnforcementTest.java`
- **Referência:**
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/ProcessoController.java` (endpoints e suas `@RequiresPermission`)
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/ProcessoCalculoController.java`
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/RubricaController.java`
  - `seeds/mcad/distribuicao.permissions.json` e `seeds/mcad/roles.json` (mapeamento perfil → permissão)
  - `/home/tsgomes/github-tassosgomes/ecad-authz/backend/sdk/authz-spring-boot-starter/src/test/java/` (padrões de WireMock para o SDK)
- **Skills para consultar:**
  - `java-testing` — JUnit 5 + AssertJ + WireMock + `@SpringBootTest`
  - `java-architecture` — estrutura `*-tests` módulo
  - `java-code-quality` — naming, AAA

## Subtarefas

- [ ] 3.1 Inventariar todos os endpoints e suas `@RequiresPermission` atuais (3 controllers, ~9 endpoints)
- [ ] 3.2 Construir tabela de mapeamento esperado: endpoint × perfil → status esperado (200/201/204 ou 403)
- [ ] 3.3 Implementar helper `givenCallerWithRole(String roleKey)` que configura WireMock para responder `{allowed: true}` apenas para as permissões daquele perfil (lendo `seeds/mcad/roles.json`)
- [ ] 3.4 Ampliar `AuthzPermissionEnforcementTest` com testes parametrizados (`@ParameterizedTest` + `@MethodSource` ou `@CsvSource`) cobrindo a matriz 4 perfis × 9 endpoints
- [ ] 3.5 Adicionar testes específicos para os estados 401 (sem JWT) e 403 (sem permissão) em cada endpoint
- [ ] 3.6 Verificar que a publicação de `distribuicao.rol.processado` (RN-14) ainda funciona em finalização autorizada (re-testar caso existente)
- [ ] 3.7 Adicionar comentário no topo da classe explicando o framework (link para ADR 0006)

## Sequenciamento

- Bloqueado por: 1.0 (precisa do catálogo correto para o `roles.json` derivar mapping)
- Desbloqueia: nada
- Paralelizável: Sim — pode rodar em paralelo a 2.0, 4.0, 5.0

## Rastreabilidade

- Esta tarefa cobre: RF-01 (validação da estrutura), RF-03 (mapa Distribuição validado por testes), RN-12 (disparo manual generalizado), RN-14 (finalização produz evento)
- Evidência esperada: ≥ 36 cenários de teste verdes (≥ 4 perfis × ≥ 9 endpoints) + relatório de cobertura com pelo menos 90% das ações authz cobertas

## Detalhes de Implementação

### Endpoints a cobrir (inventário sugerido)

| Endpoint | Verbo | Permissão exigida |
|---|---|---|
| `/api/v1/processos` | GET | `distribuicao:default:processo:listar` |
| `/api/v1/processos/disponiveis` | GET | `distribuicao:default:processo:listar` |
| `/api/v1/processos/{id}` | GET | `distribuicao:default:processo:visualizar` |
| `/api/v1/processos` | POST | `distribuicao:default:processo:criar` |
| `/api/v1/processos/{id}/calcular` | POST | `distribuicao:default:processo:calcular` |
| `/api/v1/processos/{id}/aprovar` | POST | `distribuicao:default:processo:aprovar` |
| `/api/v1/processos/{id}/finalizar` | POST | `distribuicao:default:processo:finalizar` |
| `/api/v1/processos/{id}/cancelar` | POST | `distribuicao:default:processo:cancelar` |
| `/api/v1/rubricas` | GET | `distribuicao:default:rubrica:listar` |

### Tabela de expectativas (resumo)

| Endpoint | Consultor | Operador | Gerente | Analista |
|---|---|---|---|---|
| `GET /processos` | 200 | 200 | 200 | 200 |
| `POST /processos` | 403 | 201 | 403 | 201 |
| `POST .../calcular` | 403 | 200/202 | 403 | 200/202 |
| `POST .../aprovar` | 403 | 403 | 200 | 200 |
| `POST .../finalizar` | 403 | 403 | 200 | 200 |
| `POST .../cancelar` | 403 | 403 | 200 | 200 |

(Sem JWT → 401 em todos. Com JWT sem nenhuma permissão → 403 em todos exceto endpoints com `@PermitAll`, que aqui não há.)

### Esqueleto de teste parametrizado (JUnit 5)

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class AuthzPermissionEnforcementTest {

    @Autowired private WebTestClient webTestClient;
    @Autowired private MockAuthzServer mockAuthz; // wrapper de WireMock

    static Stream<Arguments> perfilEndpointMatrix() {
        return Stream.of(
            // Arguments.of(role, method, path, expectedStatus)
            Arguments.of("distribuicao.default.consultor", "GET",  "/api/v1/processos",              200),
            Arguments.of("distribuicao.default.operador",  "POST", "/api/v1/processos",              201),
            Arguments.of("distribuicao.default.consultor", "POST", "/api/v1/processos",              403),
            Arguments.of("distribuicao.default.gerente",   "POST", "/api/v1/processos/{id}/aprovar", 200),
            Arguments.of("distribuicao.default.operador",  "POST", "/api/v1/processos/{id}/aprovar", 403)
            // ... continuar matriz completa
        );
    }

    @ParameterizedTest(name = "[{0}] {1} {2} -> {3}")
    @MethodSource("perfilEndpointMatrix")
    void enforce_permission_byRoleAndEndpoint(String roleKey, String method, String path, int expectedStatus) {
        // Arrange
        var permissoesDoPapel = lerPermissoesDoSeed(roleKey);
        mockAuthz.respondAllowedForPermissions(permissoesDoPapel);
        var jwt = mockAuthz.generateJwtFor("test-subject");

        // Act
        var response = executar(method, path, jwt);

        // Assert
        assertThat(response.statusCode().value()).isEqualTo(expectedStatus);
    }
}
```

### Helper `lerPermissoesDoSeed(roleKey)`

Estratégia mais simples: copiar manualmente o array do `roles.json` para uma constante no teste, evitando dependência de file I/O no test classpath. Ex.:

```java
private static final Map<String, Set<String>> ROLE_PERMISSIONS = Map.of(
    "distribuicao.default.consultor", Set.of(
        "distribuicao:default:rubrica:listar",
        "distribuicao:default:rubrica:visualizar",
        "distribuicao:default:processo:listar",
        "distribuicao:default:processo:visualizar",
        "distribuicao:default:credito:listar",
        "distribuicao:default:credito:visualizar"
    ),
    "distribuicao.default.operador", Set.of(/* ... */),
    "distribuicao.default.gerente",  Set.of(/* ... */),
    "distribuicao.default.analista", Set.of(/* ... */)
);
```

**Convenções da stack (das skills consultadas):**

- AAA + naming `methodName_Condition_ExpectedBehavior` (`enforce_permission_byRoleAndEndpoint` está ok como nome do método principal; o `@ParameterizedTest.name` faz o detalhamento)
- AssertJ (`assertThat(...).isEqualTo(...)`)
- WireMock para mock HTTP do `ecad-authz` (já existe padrão em testes anteriores)
- Testcontainers PostgreSQL — banco isolado por suite
- Sem mocks de classes do próprio domínio
- Pasta `distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/`

## Critérios de Sucesso (Verificáveis)

- [ ] Compila: `cd services/distribuicao-api && mvn -pl arrecadacao-tests... wait, distribuicao-tests compile`
- [ ] Toda a suíte passa: `cd services/distribuicao-api && mvn -pl distribuicao-tests test -Dtest="AuthzPermissionEnforcementTest"`
- [ ] Pelo menos 36 cenários no relatório do JUnit (4 perfis × 9 endpoints; o estado "sem JWT" e "sem permissão" pode ser global, +18 ao total)
- [ ] Nenhum teste existente quebrou: `cd services/distribuicao-api && mvn test` verde
- [ ] `mvn spotless:apply` aplicado se houver mudanças Java
- [ ] Lista impressa no console pelo `@ParameterizedTest.name` permite auditoria visual do mapeamento
