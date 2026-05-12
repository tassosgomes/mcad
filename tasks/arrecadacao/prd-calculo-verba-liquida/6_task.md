---
status: pending
parallelizable: true
blocked_by: ["5.0"]
---

<task_context>
<domain>arrecadacao/application</domain>
<type>integration</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 6.0: Integrar `RegistrarPagamentoCommandHandler` com `VerbaService`

## Relacionada as User Stories

- [HU-01] Calculo automatico ao registrar pagamento (direta — fecha o loop F04→F05)
- [HU-05] Visualizar status da verba (suporte — lock aplicado antes do save)

## Visao Geral

Injetar `VerbaService` em `RegistrarPagamentoCommandHandler` e adicionar dois pontos de integracao: (a) validacao de lock **antes** do save (atende RF-16) e (b) recalculo da verba **apos** o save (atende RF-03). Tudo dentro da mesma `@Transactional` ja existente.

## Requisitos

- Adicionar `private final VerbaService verbaService;` ao handler e ao construtor
- Atualizar o fluxo do `handle(...)`:
  - **Apos** validar UDA vigente e unicidade (passo 4 atual), **antes** de `Pagamento.registrar`, chamar `verbaService.validarLockParaAlteracao(licenca.getRubricaId(), periodo)`
  - **Apos** salvar pagamento (passo 6 atual), **antes** de publicar `arrecadacao.pagamento.registrado`, chamar `verbaService.recalcularVerba(licenca.getRubricaId(), periodo)`
- Resposta do handler nao muda
- Logs MDC: incluir `rubrica` (sigla) e `periodo` para correlacao com logs do `VerbaServiceImpl`
- Atualizar `RegistrarPagamentoCommandHandlerTest` para mockar `VerbaService` e verificar:
  - `validarLockParaAlteracao` foi chamado uma vez com `(rubricaId, periodo)` corretos
  - `recalcularVerba` foi chamado uma vez com mesmos argumentos
  - Quando `validarLockParaAlteracao` lanca `VerbaEmDistribuicaoException`, pagamento NAO e salvo (transacao desfeita) e evento NAO e emitido

## Subtarefas

- [ ] 6.1 Injetar `VerbaService` no `RegistrarPagamentoCommandHandler`
- [ ] 6.2 Adicionar chamada `validarLockParaAlteracao` antes de `Pagamento.registrar`
- [ ] 6.3 Adicionar chamada `recalcularVerba` apos `pagamentoRepository.save`
- [ ] 6.4 Adicionar MDC `rubrica` e `periodo` ao logger do handler
- [ ] 6.5 Atualizar testes unitarios — incluir cenario "verba EM_DISTRIBUICAO bloqueia registro"

## Sequenciamento

- Bloqueado por: 5.0 (precisa de `VerbaServiceImpl` real para uso end-to-end)
- Desbloqueia: 9.0 (testes de integracao)
- Paralelizavel: Sim (independente de 7.0 e 8.0)

## Rastreabilidade

- Esta tarefa cobre: HU-01 (direta), HU-05 (suporte)
- Evidencia esperada: novo cenario de teste "lockBloqueiaRegistro" passa; cenario "happy path" continua passando; rollback transacional comprovado no teste de integracao da task 9.0

## Detalhes de Implementacao

Alterar o handler (manter os outros passos inalterados):

```java
@Override
@Transactional
public PagamentoResponse handle(RegistrarPagamentoCommand cmd) {
    Licenca licenca = licencaRepository.findById(cmd.licencaId())
        .orElseThrow(() -> new EntidadeNaoEncontradaException(
            "Licenca nao encontrada: " + cmd.licencaId()));

    if (licenca.getStatus() == StatusLicenca.ENCERRADA) {
        throw new IllegalStateException(
            "Nao e possivel registrar pagamento para licenca com status ENCERRADA");
    }

    UdaValor udaVigente = udaValorRepository.findVigente(LocalDate.now())
        .orElseThrow(() -> new UdaVigenteNaoEncontradaException(
            "Nao ha valor de UDA vigente para a data atual (" + LocalDate.now() + ")"));

    String periodo = YearMonth.now().toString();
    if (pagamentoRepository.existsConfirmadoByLicencaIdAndPeriodo(cmd.licencaId(), periodo)) {
        throw new PagamentoDuplicadoException(
            "Ja existe pagamento confirmado para a licenca no periodo " + periodo);
    }

    // === NOVO 4.5: validar lock da verba antes de registrar ===
    verbaService.validarLockParaAlteracao(licenca.getRubricaId(), periodo);

    Pagamento pagamento = Pagamento.registrar(
        cmd.licencaId(), cmd.quantidadeUdas(), udaVigente.getValor());
    pagamento = pagamentoRepository.save(pagamento);

    // === NOVO 6.5: recalcular verba apos save ===
    verbaService.recalcularVerba(licenca.getRubricaId(), periodo);

    outboxEventWriter.addEvent("arrecadacao.pagamento.registrado",
        pagamento.getId().toString(), buildEventPayload(pagamento));

    auditClient.publish(...);
    return toResponse(pagamento, licenca);
}
```

## Criterios de Sucesso

- `RegistrarPagamentoCommandHandlerTest` cobre: happy path com chamadas a `VerbaService`, lock bloqueia registro, rollback nao deixa pagamento gravado
- Cenario manual via Postman/cURL: registrar pagamento → consultar `arrecadacao.verbas` → ver registro criado com valores calculados; consultar `arrecadacao.outbox_events` → ver evento `arrecadacao.verba.disponivel`
- Sem warnings de transacao aninhada
