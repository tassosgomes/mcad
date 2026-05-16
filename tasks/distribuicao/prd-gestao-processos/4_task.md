---
status: done
parallelizable: false
blocked_by: ["2.0", "3.0", "1.7"]
---

<task_context>
<domain>distribuicao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database,rabbitmq</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 4.0: Commands — criar, aprovar, finalizar, cancelar, calcular (stub)

## Relacionada às User Stories

- [HU-02] Criar processo (direta)
- [HU-05] Aprovar (direta)
- [HU-06] Finalizar (direta)
- [HU-07] Cancelar (direta)

## Visão Geral

Implementar os 5 command handlers CQRS que encapsulam a lógica de negócio: criação com validação de pré-requisitos (Rol+Verba+unicidade), transições de estado com publicação de eventos via Outbox, e calcular como stub para F03. **Cada handler também publica eventos de auditoria** (`userAction` + `dataChange`) via `AuditClient` na mesma transação — depende da task 1.7 ter criado `ProcessoAuditEventFactory` + `AuditContextProvider`.

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/commands/CriarProcessoCommand.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/commands/AprovarProcessoCommand.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/commands/FinalizarProcessoCommand.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/commands/CancelarProcessoCommand.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/commands/CalcularProcessoCommand.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/commands/handlers/CriarProcessoCommandHandler.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/commands/handlers/AprovarProcessoCommandHandler.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/commands/handlers/FinalizarProcessoCommandHandler.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/commands/handlers/CancelarProcessoCommandHandler.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/commands/handlers/CalcularProcessoCommandHandler.java`

## Subtarefas

- [x] 4.1 Criar records de Command (5 records). **CriarProcessoCommand inclui `analistaResponsavel`; demais incluem `autor` (preenchido pelo controller via `Authentication.getName()`)**
- [x] 4.2 Implementar CriarProcessoCommandHandler: validar Rol, Verba, unicidade → criar → outbox de domínio → **`auditClient.publish(factory.userAction(processo, ctx, CREATE))` + `factory.dataChange(new ProcessoAuditChange(processo, CREATE, null), ctx)`**
- [x] 4.3 Implementar AprovarProcessoCommandHandler: buscar → snapshot do estado anterior → `aprovar()` → outbox → **auditoria APPROVE com `before=snapshot`/`after=processo`**
- [x] 4.4 Implementar FinalizarProcessoCommandHandler: buscar → snapshot anterior → `finalizar()` → 2 outbox events (processo.finalizado + rol.processado) → **auditoria FINALIZE**
- [x] 4.5 Implementar CancelarProcessoCommandHandler: validar justificativa (min 10) → snapshot anterior → `cancelar(justificativa)` → outbox → **auditoria CANCEL (justificativa entra no `after`)**
- [x] 4.6 Implementar CalcularProcessoCommandHandler como stub (transição CRIADO→CALCULADO sem cálculo real) → **auditoria CALCULATE**
- [x] 4.7 Logging em todas as transições (INFO para sucesso, WARN para cancelamento). **Não é substituto de auditoria — é log operacional.**
- [x] 4.8 Em cada handler, injetar via construtor: `AuditClient`, `AuditContextProvider`, `ProcessoAuditEventFactory` (criados na task 1.7)
- [x] 4.9 Verificar compilação

## Sequenciamento

- Bloqueado por: 2.0 (OutboxEventWriter), 3.0 (snapshot repos para validação), **1.7 (`AuditContextProvider`, `ProcessoAuditEventFactory`)**
- Desbloqueia: 5.0
- Paralelizável: Não (caminho crítico)

## Detalhes de Implementação

**CriarProcessoCommandHandler — validações + auditoria:**
```java
@Component
public class CriarProcessoCommandHandler implements CommandHandler<CriarProcessoCommand, ProcessoResponse> {
    private final ProcessoRepository processoRepo;
    private final SnapshotRolRepository snapshotRolRepo;
    private final SnapshotVerbaRepository snapshotVerbaRepo;
    private final OutboxEventWriter outboxEventWriter;
    private final AuditClient auditClient;
    private final AuditContextProvider auditContextProvider;
    private final ProcessoAuditEventFactory auditEventFactory;
    // construtor injection omitido

    @Override
    @Transactional
    public ProcessoResponse handle(CriarProcessoCommand cmd) {
        // 1. Validar Rol fechado existe (não cancelado)
        var snapshotRol = snapshotRolRepo.findByRubricaAndPeriodoNaoCancelado(cmd.rubricaSigla(), cmd.periodo())
            .orElseThrow(() -> new PreRequisitosException("Não existe Rol de Execuções fechado..."));
        // 2. Validar Verba disponível
        var snapshotVerba = snapshotVerbaRepo.findByRubricaAndPeriodo(cmd.rubricaSigla(), cmd.periodo())
            .orElseThrow(() -> new PreRequisitosException("Não existe Verba disponível..."));
        // 3. Validar unicidade (sem processo ativo)
        if (processoRepo.existsAtivo(cmd.rubricaSigla(), cmd.periodo())) {
            throw new ConflictException("Já existe um processo de distribuição ativo...");
        }
        // 4. Criar processo
        var processo = ProcessoDistribuicao.criar(cmd.rubricaSigla(), cmd.periodo(),
            snapshotVerba.getVerbaLiquida(), cmd.analistaResponsavel(),
            snapshotRol.getId(), snapshotVerba.getId());
        processo = processoRepo.save(processo);
        // 5. Outbox de domínio (RabbitMQ distribuicao.events)
        outboxEventWriter.addEvent("distribuicao.processo.criado",
            processo.getId().toString(), buildPayload(processo));
        // 6. AUDITORIA — userAction + dataChange (mesma transação)
        var auditCtx = auditContextProvider.current(cmd.analistaResponsavel());
        auditClient.publish(auditEventFactory.userAction(processo, auditCtx, ProcessoAuditOperation.CREATE));
        auditClient.publish(auditEventFactory.dataChange(
            new ProcessoAuditChange(processo, ProcessoAuditOperation.CREATE, null), auditCtx));
        return ProcessoResponse.from(processo);
    }
}
```

**Padrão para handlers de transição** (Aprovar, Finalizar, Cancelar, Calcular):

```java
@Override @Transactional
public ProcessoResponse handle(AprovarProcessoCommand cmd) {
    var processo = processoRepo.findById(cmd.processoId())
        .orElseThrow(() -> new NotFoundException("Processo not found"));
    var antes = ProcessoSnapshot.from(processo);  // captura before
    processo.aprovar();
    processo = processoRepo.save(processo);
    outboxEventWriter.addEvent("distribuicao.processo.aprovado",
        processo.getId().toString(), buildPayload(processo));
    var auditCtx = auditContextProvider.current(cmd.autor());
    auditClient.publish(auditEventFactory.userAction(processo, auditCtx, ProcessoAuditOperation.APPROVE));
    auditClient.publish(auditEventFactory.dataChange(
        new ProcessoAuditChange(processo, ProcessoAuditOperation.APPROVE, antes), auditCtx));
    return ProcessoResponse.from(processo);
}
```

**FinalizarProcessoCommandHandler — 2 eventos:**
```java
// Publica: distribuicao.processo.finalizado + distribuicao.rol.processado
outboxEventWriter.addEvent("distribuicao.processo.finalizado", processo.getId().toString(), ...);
outboxEventWriter.addEvent("distribuicao.rol.processado", processo.getId().toString(),
    Map.of("processoId", processo.getId(), "rubrica", processo.getRubricaSigla(),
           "periodo", processo.getPeriodo(), "captacaoId", snapshotRolId));
```

**CalcularProcessoCommandHandler — stub:**
```java
// Na F02, apenas transiciona o estado sem cálculo real.
// F03 vai substituir a lógica interna deste handler.
processo.marcarCalculado(0); // totalExecucoes = 0 como placeholder
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/distribuicao-api && mvn compile`
- [ ] CriarProcessoCommandHandler valida: Rol, Verba, unicidade
- [ ] Sem Rol → PreRequisitosException; Sem Verba → PreRequisitosException; Duplicata → ConflictException
- [ ] FinalizarProcessoCommandHandler insere 2 outbox events de domínio
- [ ] CancelarProcessoCommandHandler rejeita justificativa < 10 chars
- [ ] CalcularProcessoCommandHandler faz transição stub CRIADO→CALCULADO
- [ ] **Cada handler de comando (CREATE/CALCULATE/APPROVE/FINALIZE/CANCEL) gera exatamente 1 `userAction` + 1 `dataChange` na tabela `distribuicao.audit_outbox` na mesma transação** (validado pelos testes de 6.0)
- [ ] **Handlers de transição (Aprovar/Finalizar/Cancelar) capturam o estado anterior (`before`) ANTES de chamar o método do domain, para preencher corretamente o `dataChange.before`**
- [ ] **Nenhum handler usa `@PreAuthorize` ou checagem de role interna** — autorização é responsabilidade exclusiva do controller via `@RequiresPermission`
