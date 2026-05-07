---
status: in_progress
parallelizable: false
blocked_by: ["3.0", "4.0"]
---

<task_context>
<domain>distribuicao/tests</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database,rabbitmq</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 6.0: Testes backend — unitários e integração

## Relacionada às User Stories

- [HU-01] Sincronização automática de rubricas (verificação)
- [HU-02] Consultar rubricas disponíveis (verificação)

## Visão Geral

Implementar testes unitários (Mockito + AssertJ) e testes de integração (Testcontainers + Spring Boot Test) cobrindo o consumidor de eventos, o handler de upsert, os query handlers e o controller REST.

## Requisitos

- Testes unitários: RubricaEventHandler (upsert, idempotência), query handlers (listagem, busca, 404)
- Testes integração: listener RabbitMQ end-to-end (CloudEvent → PostgreSQL), controller HTTP (200, 404, 405)
- Testcontainers para PostgreSQL e RabbitMQ
- Cobertura dos critérios de aceitação do PRD

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/RubricaEventHandlerTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/RubricaQueryHandlerTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/RubricaEventListenerIntegrationTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/RubricaControllerIntegrationTest.java`
- **Referência:**
  - `services/arrecadacao-api/arrecadacao-tests/` (padrão de testes do projeto)
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/RabbitMqPublisher.java` (formato do CloudEvent para simular no teste)
- **Skills para consultar durante implementação:**
  - `java-testing` — JUnit 5, AssertJ, Mockito, Testcontainers, AAA pattern
  - `java-code-quality` — naming conventions para testes

## Subtarefas

- [ ] 6.1 Criar `RubricaEventHandlerTest.java`:
  - Teste: cria rubrica quando sigla não existe
  - Teste: atualiza rubrica quando sigla já existe
  - Teste: múltiplas chamadas com mesmo payload não duplicam (idempotência)
- [ ] 6.2 Criar `RubricaQueryHandlerTest.java`:
  - Teste: listar retorna lista com N rubricas
  - Teste: listar retorna lista vazia
  - Teste: buscar por sigla existente retorna rubrica
  - Teste: buscar por sigla inexistente lança NotFoundException
- [ ] 6.3 Criar `RubricaEventListenerIntegrationTest.java` (Testcontainers PostgreSQL + RabbitMQ):
  - Teste: publicar CloudEvent válido → rubrica persistida no PostgreSQL
  - Teste: publicar evento com payload inválido → descartado sem erro
  - Teste: publicar mesmo evento 2x → sem duplicação (idempotência)
- [ ] 6.4 Criar `RubricaControllerIntegrationTest.java` (Testcontainers PostgreSQL):
  - Teste: GET /rubricas retorna 200 com lista
  - Teste: GET /rubricas retorna 200 com [] quando vazio
  - Teste: GET /rubricas/{sigla} retorna 200
  - Teste: GET /rubricas/{sigla} retorna 404 ProblemDetail
  - Teste: POST /rubricas retorna 405 ProblemDetail

## Sequenciamento

- Bloqueado por: 3.0 e 4.0 (precisa de todo o backend implementado)
- Desbloqueia: nenhum
- Paralelizável: Não (depende do código a testar)

## Rastreabilidade

- Esta tarefa cobre: verificação de RF-01 a RF-08
- Evidência esperada: `mvn test` passa com todos os testes verdes

## Detalhes de Implementação

**Padrão AAA (Arrange-Act-Assert):**
```java
@Test
void deveCriarRubricaQuandoSiglaNaoExiste() {
    // Arrange
    var payload = new RubricaEventPayload("RADIO", "Rádio AM/FM", false);
    when(repository.findBySigla("RADIO")).thenReturn(Optional.empty());

    // Act
    handler.handle(payload);

    // Assert
    verify(repository).upsertBySigla(argThat(r ->
        r.getSigla().equals("RADIO") &&
        r.getNome().equals("Rádio AM/FM") &&
        !r.isExigeClassificacao()
    ));
}
```

**Teste de integração com RabbitMQ (CloudEvent simulado):**
```java
@SpringBootTest
@Testcontainers
class RubricaEventListenerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Container
    static RabbitMQContainer rabbitmq = new RabbitMQContainer("rabbitmq:3.13-management");

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private RubricaRepository rubricaRepository;

    @Test
    void devePersisteRubricaAoReceberEventoCriada() {
        // Arrange — montar CloudEvent JSON idêntico ao da Arrecadação
        var cloudEventJson = """
            {
                "specversion": "1.0",
                "id": "test-uuid",
                "source": "urn:arrecadacao-api",
                "type": "arrecadacao.rubrica.criada",
                "subject": "RADIO",
                "time": "2026-04-08T10:00:00Z",
                "datacontenttype": "application/json",
                "data": {
                    "sigla": "RADIO",
                    "nome": "Rádio AM/FM",
                    "exigeClassificacao": false
                }
            }
            """;

        // Act
        rabbitTemplate.convertAndSend("arrecadacao.events", "arrecadacao.rubrica.criada", cloudEventJson);

        // Assert (with Awaitility)
        await().atMost(5, SECONDS).untilAsserted(() -> {
            var rubrica = rubricaRepository.findBySigla("RADIO");
            assertThat(rubrica).isPresent();
            assertThat(rubrica.get().getNome()).isEqualTo("Rádio AM/FM");
        });
    }
}
```

**Naming convention para testes:**
- Unitários: `deve[Ação]Quando[Condição]` (ex: `deveCriarRubricaQuandoSiglaNaoExiste`)
- Integração: `deve[Resultado]Ao[Trigger]` (ex: `devePersisteRubricaAoReceberEventoCriada`)

**Convenções da stack:**
- JUnit 5 `@Test` (não JUnit 4)
- AssertJ `assertThat()` (não Hamcrest)
- Mockito `@Mock` + `@InjectMocks` para unitários
- `@SpringBootTest` + `@Testcontainers` para integração
- Awaitility para asserts assíncronos (RabbitMQ consumer)
- Cada cenário em método separado (não agrupar com if/else)

## Critérios de Sucesso (Verificáveis)

- [ ] Testes unitários passam: `cd services/distribuicao-api && mvn -pl distribuicao-tests test -Dtest="*Unit*"`
- [ ] Testes integração passam: `cd services/distribuicao-api && mvn -pl distribuicao-tests test -Dtest="*Integration*"`
- [ ] Todos os testes passam: `cd services/distribuicao-api && mvn test`
- [ ] Mínimo 4 testes unitários (handler + query handlers)
- [ ] Mínimo 5 testes de integração (listener + controller)
