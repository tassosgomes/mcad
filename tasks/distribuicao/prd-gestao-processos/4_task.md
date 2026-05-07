---
status: pending
parallelizable: false
blocked_by: ["2.0", "3.0"]
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

Implementar os 5 command handlers CQRS que encapsulam a lógica de negócio: criação com validação de pré-requisitos (Rol+Verba+unicidade), transições de estado com publicação de eventos via Outbox, e calcular como stub para F03.

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

- [ ] 4.1 Criar records de Command (5 records)
- [ ] 4.2 Implementar CriarProcessoCommandHandler: validar Rol, Verba, unicidade → criar → outbox
- [ ] 4.3 Implementar AprovarProcessoCommandHandler: buscar + aprovar() + outbox
- [ ] 4.4 Implementar FinalizarProcessoCommandHandler: buscar + finalizar() + 2 outbox events (processo.finalizado + rol.processado)
- [ ] 4.5 Implementar CancelarProcessoCommandHandler: validar justificativa (min 10) + cancelar() + outbox
- [ ] 4.6 Implementar CalcularProcessoCommandHandler como stub (transição CRIADO→CALCULADO sem cálculo real)
- [ ] 4.7 Logging em todas as transições (INFO para sucesso, WARN para cancelamento)
- [ ] 4.8 Verificar compilação

## Sequenciamento

- Bloqueado por: 2.0 (OutboxEventWriter), 3.0 (snapshot repos para validação)
- Desbloqueia: 5.0
- Paralelizável: Não (caminho crítico)

## Detalhes de Implementação

**CriarProcessoCommandHandler — validações:**
```java
@Service @Transactional
public class CriarProcessoCommandHandler {
    public ProcessoDistribuicao handle(CriarProcessoCommand cmd) {
        // 1. Validar Rol fechado existe (não cancelado)
        var snapshotRol = snapshotRolRepo.findByRubricaAndPeriodoNaoCancelado(cmd.rubricaSigla(), cmd.periodo())
            .orElseThrow(() -> new PreRequisitosException("Não existe Rol de Execuções fechado para rubrica %s período %s"));
        // 2. Validar Verba disponível
        var snapshotVerba = snapshotVerbaRepo.findByRubricaAndPeriodo(cmd.rubricaSigla(), cmd.periodo())
            .orElseThrow(() -> new PreRequisitosException("Não existe Verba disponível para rubrica %s período %s"));
        // 3. Validar unicidade (sem processo ativo)
        if (processoRepo.existsAtivo(cmd.rubricaSigla(), cmd.periodo())) {
            throw new ConflictException("Já existe um processo de distribuição ativo para rubrica %s período %s");
        }
        // 4. Criar processo
        var processo = ProcessoDistribuicao.criar(cmd.rubricaSigla(), cmd.periodo(),
            snapshotVerba.getVerbaLiquida(), cmd.analistaResponsavel(),
            snapshotRol.getId(), snapshotVerba.getId());
        processoRepo.save(processo);
        // 5. Outbox event
        outboxEventWriter.addEvent("distribuicao.processo.criado", processo.getId().toString(), buildPayload(processo));
        return processo;
    }
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
- [ ] FinalizarProcessoCommandHandler insere 2 outbox events
- [ ] CancelarProcessoCommandHandler rejeita justificativa < 10 chars
- [ ] CalcularProcessoCommandHandler faz transição stub CRIADO→CALCULADO
