---
status: pending
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>arrecadacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Application — EstornarPagamentoCommand + Handler + DTO + testes

## Relacionada as User Stories

- [HU-01] Estornar pagamento (cobertura direta — orquestracao)

## Visao Geral

Implementar o command, handler e DTO de request para o estorno. O handler orquestra: buscar pagamento, validar lock de verba (via VerbaService), chamar domain method, salvar, recalcular verba e publicar evento Outbox. Tambem estender PagamentoResponse com os 3 campos de estorno. Inclui testes unitarios com mock do VerbaService.

## Requisitos

1. EstornarPagamentoCommand record com pagamentoId, justificativa, autor
2. EstornarPagamentoRequest com Bean Validation (@NotBlank, @Size)
3. EstornarPagamentoCommandHandler com @Transactional: busca, lock, estornar, save, recalcular, evento
4. Estender PagamentoResponse com 3 campos nullable de estorno
5. Evento CloudEvents 1.0 com payload incluindo rubricaSigla e verbaLiquidaAtualizada
6. Testes unitarios com mock de VerbaService, PagamentoRepository, OutboxEventWriter

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/EstornarPagamentoCommand.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/EstornarPagamentoCommandHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/EstornarPagamentoRequest.java`
  - `services/arrecadacao-api/arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/EstornarPagamentoCommandHandlerTest.java`
- **Modificar:**
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/PagamentoResponse.java` (adicionar 3 campos nullable)
  - Mapper no handler existente de ListarPagamentos/BuscarPagamento (mapear novos campos como null quando CONFIRMADO)
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/RegistrarPagamentoCommandHandler.java` (padrao handler + Outbox)
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/RegistrarPagamentoCommand.java` (padrao command)
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/OutboxEventWriter.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/VerbaService.java` (criado na task 2.0)

## Subtarefas

- [ ] 3.1 Criar `EstornarPagamentoCommand` (record)
- [ ] 3.2 Criar `EstornarPagamentoRequest` com Bean Validation
- [ ] 3.3 Criar `EstornarPagamentoCommandHandler` com @Transactional e 6 steps
- [ ] 3.4 Estender `PagamentoResponse` com justificativaEstorno, estornadoPor, estornadoEm (nullable)
- [ ] 3.5 Atualizar mapeamento em handlers de query existentes para incluir novos campos
- [ ] 3.6 Criar `EstornarPagamentoCommandHandlerTest` com 5 cenarios

## Detalhes de Implementacao

**EstornarPagamentoCommand:**

```java
public record EstornarPagamentoCommand(
    UUID pagamentoId, String justificativa, String autor
) implements Command<PagamentoResponse> {}
```

**EstornarPagamentoRequest:**

```java
public record EstornarPagamentoRequest(
    @NotBlank @Size(min = 10, max = 500) String justificativa
) {}
```

**EstornarPagamentoCommandHandler:**

```java
@Service
@Transactional
public class EstornarPagamentoCommandHandler
        implements CommandHandler<EstornarPagamentoCommand, PagamentoResponse> {

    private final PagamentoRepository pagamentoRepository;
    private final VerbaService verbaService;
    private final OutboxEventWriter outboxEventWriter;

    @Override
    public PagamentoResponse handle(EstornarPagamentoCommand cmd) {
        // 1. Buscar pagamento (404)
        Pagamento pagamento = pagamentoRepository.findById(cmd.pagamentoId())
            .orElseThrow(() -> new EntidadeNaoEncontradaException("Pagamento not found"));

        // 2. Validar lock de verba (422 VerbaEmDistribuicaoException)
        verbaService.validarLockParaEstorno(pagamento.getLicencaId(), pagamento.getPeriodo());

        // 3. Estornar (domain method — valida status + preenche campos)
        pagamento.estornar(cmd.justificativa(), cmd.autor());

        // 4. Salvar
        pagamento = pagamentoRepository.save(pagamento);

        // 5. Recalcular verba
        String rubricaSigla = pagamento.getLicenca().getRubrica().getSigla();
        verbaService.recalcularVerba(rubricaSigla, pagamento.getPeriodo());

        // 6. Publicar evento Outbox
        outboxEventWriter.addEvent(
            "arrecadacao.pagamento.estornado",
            pagamento.getId().toString(),
            buildEventPayload(pagamento, rubricaSigla));

        return mapToResponse(pagamento);
    }
}
```

**PagamentoResponse — extensao:**

```java
public record PagamentoResponse(
    UUID id, LicencaResumoResponse licenca,
    String quantidadeUdas, String valorUdaNoMomento, String valorBruto,
    String periodo, String status,
    Instant dataRegistro, Instant criadoEm, Instant atualizadoEm,
    String justificativaEstorno, String estornadoPor, Instant estornadoEm
) {}
```

## Testes

- [ ] `handle_WithValidCommand_ShouldEstornarAndPublishEvent` — happy path, verifica status ESTORNADO, campos preenchidos, outboxEventWriter.addEvent chamado, verbaService.recalcularVerba chamado
- [ ] `handle_WithPagamentoNotFound_ShouldThrow404`
- [ ] `handle_WithPagamentoJaEstornado_ShouldThrow422` — domain guard lanca IllegalStateException
- [ ] `handle_WithVerbaEmDistribuicao_ShouldThrow422` — VerbaService lanca VerbaEmDistribuicaoException
- [ ] `handle_ShouldCallValidarLockBeforeEstornar` — order verification: lock validado ANTES do estorno

## Criterios de Sucesso

- [ ] Testes passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-application`
- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-application`
- [ ] Handler registra-se no CQRS dispatcher automaticamente
