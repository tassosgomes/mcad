---
status: pending
parallelizable: false
blocked_by: ["3.0"]
---

<task_context>
<domain>arrecadacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 4.0: Commands + Handlers — AjustarUda e RegistrarPagamento + testes unitarios

## Relacionada as User Stories

- [HU-01] Ajustar valor da UDA (cobertura direta)
- [HU-03] Registrar pagamento (cobertura direta)

## Visao Geral

Implementar os dois commands e seus handlers: `AjustarUdaCommand` (cria novo UdaValor) e `RegistrarPagamentoCommand` (valida licenca, UDA vigente, unicidade, calcula e publica evento Outbox). O `RegistrarPagamentoCommandHandler` e o componente mais complexo — orquestra 4 validacoes antes de registrar e publicar evento via `OutboxEventWriter`.

## Requisitos

- `AjustarUdaCommand`: record com valor, dataVigencia, autor
- `AjustarUdaCommandHandler`: chama UdaValor.criar(), salva, mapeia para UdaResponse
- `RegistrarPagamentoCommand`: record com licencaId, quantidadeUdas, autor
- `RegistrarPagamentoCommandHandler`:
  1. Busca licenca (404 se nao encontrada)
  2. Valida status ATIVA ou SUSPENSA (422 se ENCERRADA)
  3. Busca UDA vigente (422 se nao encontrada)
  4. Valida unicidade (409 se ja existe CONFIRMADO no periodo)
  5. Registra pagamento via factory
  6. Salva pagamento
  7. Publica evento via OutboxEventWriter
  8. Mapeia para PagamentoResponse com licenca expandida
- Testes unitarios para ambos os handlers

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/AjustarUdaCommand.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/RegistrarPagamentoCommand.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/AjustarUdaCommandHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/RegistrarPagamentoCommandHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/AjustarUdaCommandHandlerTest.java`
  - `services/arrecadacao-api/arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/RegistrarPagamentoCommandHandlerTest.java`
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/UdaValor.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/Pagamento.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/Licenca.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/OutboxEventWriter.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/Command.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/CommandHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/CriarLicencaCommandHandler.java` (padrao de handler existente)
- **Skills para consultar durante implementacao:**
  - `java-architecture` — CQRS Command/Handler, @Transactional, Outbox Pattern
  - `java-code-quality` — records para commands, guard clauses
  - `java-testing` — Mockito mocks, AAA pattern

## Subtarefas

- [ ] 4.1 Criar `AjustarUdaCommand` (record)
- [ ] 4.2 Criar `RegistrarPagamentoCommand` (record)
- [ ] 4.3 Criar `AjustarUdaCommandHandler` com @Transactional
- [ ] 4.4 Criar `RegistrarPagamentoCommandHandler` com @Transactional, 4 validacoes e Outbox
- [ ] 4.5 Criar `AjustarUdaCommandHandlerTest` — happy path, valor invalido
- [ ] 4.6 Criar `RegistrarPagamentoCommandHandlerTest` — happy path (verifica calculo e evento), licenca 404, licenca ENCERRADA 422, sem UDA vigente 422, duplicado 409

## Sequenciamento

- Bloqueado por: 3.0
- Desbloqueia: 5.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-07, RF-08, RF-09, RF-10, RF-12, RF-13, RN-P01 a RN-P09
- Evidencia esperada: testes unitarios passam; handlers registram-se no CQRS dispatcher

## Detalhes de Implementacao

**AjustarUdaCommand:**

```java
public record AjustarUdaCommand(
    BigDecimal valor, LocalDate dataVigencia, String autor
) implements Command<UdaResponse> {}
```

**RegistrarPagamentoCommand:**

```java
public record RegistrarPagamentoCommand(
    UUID licencaId, BigDecimal quantidadeUdas, String autor
) implements Command<PagamentoResponse> {}
```

**RegistrarPagamentoCommandHandler (logica central):**

```java
@Service
@Transactional
public class RegistrarPagamentoCommandHandler
        implements CommandHandler<RegistrarPagamentoCommand, PagamentoResponse> {

    private final LicencaRepository licencaRepository;
    private final UdaValorRepository udaValorRepository;
    private final PagamentoRepository pagamentoRepository;
    private final OutboxEventWriter outboxEventWriter;

    // constructor injection

    @Override
    public PagamentoResponse handle(RegistrarPagamentoCommand cmd) {
        // 1. Buscar licenca
        Licenca licenca = licencaRepository.findById(cmd.licencaId())
            .orElseThrow(() -> new EntityNotFoundException("Licenca not found"));

        // 2. Validar status
        if (licenca.getStatus() == StatusLicenca.ENCERRADA) {
            throw new IllegalStateException(
                "Cannot register payment for license with status ENCERRADA");
        }

        // 3. Buscar UDA vigente
        UdaValor udaVigente = udaValorRepository.findVigente(LocalDate.now())
            .orElseThrow(() -> new UdaVigenteNaoEncontradaException(
                "No UDA value found for current date"));

        // 4. Validar unicidade
        String periodo = YearMonth.now().toString();
        if (pagamentoRepository.existsConfirmadoByLicencaIdAndPeriodo(
                cmd.licencaId(), periodo)) {
            throw new PagamentoDuplicadoException(
                "Payment already exists for license in period " + periodo);
        }

        // 5. Registrar
        Pagamento pagamento = Pagamento.registrar(
            cmd.licencaId(), cmd.quantidadeUdas(), udaVigente.getValor());

        // 6. Salvar
        pagamento = pagamentoRepository.save(pagamento);

        // 7. Publicar evento Outbox
        outboxEventWriter.addEvent(
            "arrecadacao.pagamento.registrado",
            pagamento.getId().toString(),
            buildEventPayload(pagamento));

        // 8. Mapear response com licenca expandida
        return mapToResponse(pagamento, licenca);
    }
}
```

**Evento Outbox payload (CloudEvents 1.0):**

```json
{
  "pagamentoId": "uuid",
  "licencaId": "uuid",
  "periodo": "2026-04",
  "quantidadeUdas": "2.500000",
  "valorUdaNoMomento": "107.310000",
  "valorBruto": "268.275000",
  "status": "CONFIRMADO",
  "dataRegistro": "2026-04-05T14:30:00Z"
}
```

**Teste RegistrarPagamentoCommandHandler — cenarios:**

```java
@ExtendWith(MockitoExtension.class)
class RegistrarPagamentoCommandHandlerTest {

    @Mock LicencaRepository licencaRepository;
    @Mock UdaValorRepository udaValorRepository;
    @Mock PagamentoRepository pagamentoRepository;
    @Mock OutboxEventWriter outboxEventWriter;
    @InjectMocks RegistrarPagamentoCommandHandler handler;

    @Test
    void handle_WithValidCommand_ShouldReturnPagamentoWithCalculatedValues() {
        // Arrange: mock licenca ATIVA, UDA 107.31, nao duplicado
        // Act: handler.handle(cmd)
        // Assert: response.valorBruto = "268.275000" (2.5 × 107.31)
        // Verify: outboxEventWriter.addEvent called
    }

    @Test
    void handle_WithLicencaNotFound_ShouldThrow404() { }

    @Test
    void handle_WithLicencaEncerrada_ShouldThrow422() { }

    @Test
    void handle_WithNoUdaVigente_ShouldThrowUdaVigenteNaoEncontrada() { }

    @Test
    void handle_WithDuplicatePayment_ShouldThrowPagamentoDuplicado() { }
}
```

**Convencoes da stack:**
- Handlers sao @Service com @Transactional
- Records para commands (imutaveis)
- Constructor injection com campos final
- Testes AAA com Mockito, naming `methodName_Condition_ExpectedBehavior`

## Criterios de Sucesso (Verificaveis)

- [ ] Testes passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-application`
- [ ] `AjustarUdaCommandHandlerTest` — happy path + valor invalido
- [ ] `RegistrarPagamentoCommandHandlerTest` — 5 cenarios (happy path, 404, 422 encerrada, 422 sem UDA, 409)
- [ ] Verify: outboxEventWriter.addEvent chamado no happy path
- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-application`
