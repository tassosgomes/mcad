package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.application.audit.AuditContext;
import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditChange;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditEventFactory;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditOperation;
import br.com.ecad.distribuicao.application.commands.AprovarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.CancelarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.FinalizarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.handlers.AprovarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.commands.handlers.CancelarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.commands.handlers.FinalizarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.application.services.CreditoRetidoLiberacaoService;
import br.com.ecad.distribuicao.application.services.CreditoRetidoLiberacaoService.ResultadoLiberacaoRetidos;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.CreditoLiberacao;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.exceptions.TransicaoInvalidaException;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotRolRepository;
import br.org.ecad.audit.contract.AuditEvent;
import br.org.ecad.audit.sdk.AuditClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TransicoesCommandHandlerTest {

    private static final UUID PROCESSO_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID PROCESSO_ORIGEM_ID = UUID.fromString("00000000-0000-0000-0000-000000000011");
    private static final UUID CREDITO_ID = UUID.fromString("00000000-0000-0000-0000-000000000021");
    private static final String AUTOR = "analista@ecad.org";

    @Mock private ProcessoRepository processoRepository;
    @Mock private CreditoRepository creditoRepository;
    @Mock private SnapshotRolRepository snapshotRolRepository;
    @Mock private CreditoRetidoLiberacaoService creditoRetidoLiberacaoService;
    @Mock private OutboxEventWriter outboxEventWriter;
    @Mock private AuditClient auditClient;
    @Mock private AuditContextProvider auditContextProvider;
    @Mock private ProcessoAuditEventFactory auditEventFactory;

    private AprovarProcessoCommandHandler aprovarHandler;
    private FinalizarProcessoCommandHandler finalizarHandler;
    private CancelarProcessoCommandHandler cancelarHandler;

    @BeforeEach
    void setUp() {
        aprovarHandler = new AprovarProcessoCommandHandler(
                processoRepository, outboxEventWriter, auditClient, auditContextProvider, auditEventFactory);
        finalizarHandler = new FinalizarProcessoCommandHandler(
                processoRepository, creditoRepository, snapshotRolRepository, creditoRetidoLiberacaoService,
                outboxEventWriter, auditClient, auditContextProvider, auditEventFactory);
        cancelarHandler = new CancelarProcessoCommandHandler(
                processoRepository, creditoRetidoLiberacaoService,
                outboxEventWriter, auditClient, auditContextProvider, auditEventFactory);

        // Lenient stubs: not all tests reach the audit code (e.g. exception paths)
        org.mockito.Mockito.lenient().when(auditContextProvider.current(AUTOR)).thenReturn(auditContext());
        org.mockito.Mockito.lenient().when(auditEventFactory.userAction(any(), any(), any())).thenReturn(mockAuditEvent());
        org.mockito.Mockito.lenient().when(auditEventFactory.dataChange(any(), any())).thenReturn(mockAuditEvent());
        org.mockito.Mockito.lenient()
                .when(creditoRetidoLiberacaoService.efetivarLiberacoes(any(), any()))
                .thenReturn(ResultadoLiberacaoRetidos.empty());
        org.mockito.Mockito.lenient()
                .when(creditoRetidoLiberacaoService.cancelarLiberacoesPrevistas(any(), any()))
                .thenReturn(0);
    }

    // === APROVAR TESTS ===

    @Test
    void aprovar_DeCalculado_ShouldTransicionarParaAprovado() {
        ProcessoDistribuicao processo = criarProcessoCalculado();
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(processoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProcessoResponse response = aprovarHandler.handle(new AprovarProcessoCommand(PROCESSO_ID, AUTOR));

        assertThat(response.status()).isEqualTo(StatusProcesso.APROVADO);
        verify(outboxEventWriter).addEvent(eq("distribuicao.processo.aprovado"), any(), any());
        verify(auditClient, times(2)).publish(any(AuditEvent.class));
    }

    @Test
    void aprovar_DeCriado_ShouldThrowTransicaoInvalidaException() {
        ProcessoDistribuicao processo = criarProcessoCriado();
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));

        assertThatThrownBy(() -> aprovarHandler.handle(new AprovarProcessoCommand(PROCESSO_ID, AUTOR)))
                .isInstanceOf(TransicaoInvalidaException.class);
    }

    @Test
    void aprovar_ProcessoNaoEncontrado_ShouldThrowNotFoundException() {
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> aprovarHandler.handle(new AprovarProcessoCommand(PROCESSO_ID, AUTOR)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void aprovar_ShouldCapturarBeforeAntesDeMutar() {
        ProcessoDistribuicao processo = criarProcessoCalculado();
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(processoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        aprovarHandler.handle(new AprovarProcessoCommand(PROCESSO_ID, AUTOR));

        ArgumentCaptor<ProcessoAuditChange> changeCaptor = ArgumentCaptor.forClass(ProcessoAuditChange.class);
        verify(auditEventFactory).dataChange(changeCaptor.capture(), any());
        // before deve ser CALCULADO (estado anterior)
        assertThat(changeCaptor.getValue().before()).isNotNull();
        assertThat(changeCaptor.getValue().before().status()).isEqualTo(StatusProcesso.CALCULADO);
        // operation deve ser APPROVE
        assertThat(changeCaptor.getValue().operation()).isEqualTo(ProcessoAuditOperation.APPROVE);
    }

    // === FINALIZAR TESTS ===

    @Test
    void finalizar_DeAprovado_ShouldTransicionarParaFinalizado() {
        ProcessoDistribuicao processo = criarProcessoAprovado();
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(processoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProcessoResponse response = finalizarHandler.handle(new FinalizarProcessoCommand(PROCESSO_ID, AUTOR));

        assertThat(response.status()).isEqualTo(StatusProcesso.FINALIZADO);
        // 2 eventos de domínio para finalização
        verify(outboxEventWriter).addEvent(eq("distribuicao.processo.finalizado"), any(), any());
        verify(outboxEventWriter).addEvent(eq("distribuicao.rol.processado"), any(), any());
        verify(auditClient, times(2)).publish(any(AuditEvent.class));
    }

    @Test
    void finalizar_DeCalculado_ShouldThrowTransicaoInvalidaException() {
        ProcessoDistribuicao processo = criarProcessoCalculado();
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));

        assertThatThrownBy(() -> finalizarHandler.handle(new FinalizarProcessoCommand(PROCESSO_ID, AUTOR)))
                .isInstanceOf(TransicaoInvalidaException.class);
    }

    @Test
    void finalizar_ShouldCapturarBeforeAntesDeMutar() {
        ProcessoDistribuicao processo = criarProcessoAprovado();
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(processoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        finalizarHandler.handle(new FinalizarProcessoCommand(PROCESSO_ID, AUTOR));

        ArgumentCaptor<ProcessoAuditChange> changeCaptor = ArgumentCaptor.forClass(ProcessoAuditChange.class);
        verify(auditEventFactory).dataChange(changeCaptor.capture(), any());
        assertThat(changeCaptor.getValue().before()).isNotNull();
        assertThat(changeCaptor.getValue().before().status()).isEqualTo(StatusProcesso.APROVADO);
        assertThat(changeCaptor.getValue().operation()).isEqualTo(ProcessoAuditOperation.FINALIZE);
    }

    @Test
    void finalizar_ComLiberacoesPrevistas_ShouldPublishCreditoLiberadoEvent() {
        ProcessoDistribuicao processo = criarProcessoAprovado();
        ProcessoDistribuicao origem = criarProcessoOrigemFinalizado();
        Credito credito = creditoRetido();
        CreditoLiberacao liberacao = CreditoLiberacao.prevista(
                credito,
                processo,
                Instant.parse("2026-05-17T10:00:00Z"));
        credito.liberar(PROCESSO_ID, Instant.parse("2026-05-17T12:00:00Z"));
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(processoRepository.findById(PROCESSO_ORIGEM_ID)).thenReturn(Optional.of(origem));
        when(processoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(creditoRetidoLiberacaoService.efetivarLiberacoes(any(), any()))
                .thenReturn(new ResultadoLiberacaoRetidos(
                        List.of(liberacao),
                        List.of(),
                        1,
                        new BigDecimal("400.00")));
        when(creditoRepository.findById(CREDITO_ID)).thenReturn(Optional.of(credito));

        finalizarHandler.handle(new FinalizarProcessoCommand(PROCESSO_ID, AUTOR));

        ArgumentCaptor<String> eventTypeCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(outboxEventWriter, times(3)).addEvent(eventTypeCaptor.capture(), any(), payloadCaptor.capture());
        assertThat(eventTypeCaptor.getAllValues()).contains("distribuicao.credito.liberado");
        Object payload = payloadCaptor.getAllValues().get(eventTypeCaptor.getAllValues()
                .indexOf("distribuicao.credito.liberado"));
        assertThat(payload).isInstanceOf(Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> payloadMap = (Map<String, Object>) payload;
        assertThat(payloadMap)
                .containsEntry("creditoId", CREDITO_ID.toString())
                .containsEntry("processoOrigemId", PROCESSO_ORIGEM_ID.toString())
                .containsEntry("processoLiberacaoId", PROCESSO_ID.toString())
                .containsEntry("periodoOrigem", "2026-02")
                .containsEntry("periodoLiberacao", "2026-03")
                .containsEntry("motivoRetencaoOriginal", "TITULAR_SEM_ASSOCIACAO");
    }

    // === CANCELAR TESTS ===

    @Test
    void cancelar_ComJustificativaValida_ShouldCancelar() {
        ProcessoDistribuicao processo = criarProcessoCriado();
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(processoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProcessoResponse response = cancelarHandler.handle(
                new CancelarProcessoCommand(PROCESSO_ID, "Justificativa válida com 10+ chars", AUTOR));

        assertThat(response.status()).isEqualTo(StatusProcesso.CANCELADO);
        verify(outboxEventWriter).addEvent(eq("distribuicao.processo.cancelado"), any(), any());
        verify(auditClient, times(2)).publish(any(AuditEvent.class));
    }

    @Test
    void cancelar_JustificativaCurta_ShouldThrowPreRequisitosException() {
        assertThatThrownBy(() -> cancelarHandler.handle(
                new CancelarProcessoCommand(PROCESSO_ID, "curta", AUTOR)))
                .isInstanceOf(PreRequisitosException.class);
    }

    @Test
    void cancelar_ProcessoFinalizado_ShouldThrowTransicaoInvalidaException() {
        ProcessoDistribuicao processo = criarProcessoFinalizado();
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));

        assertThatThrownBy(() -> cancelarHandler.handle(
                new CancelarProcessoCommand(PROCESSO_ID, "Justificativa suficientemente longa", AUTOR)))
                .isInstanceOf(TransicaoInvalidaException.class);
    }

    @Test
    void cancelar_ShouldCapturarBeforeAntesDeMutar() {
        ProcessoDistribuicao processo = criarProcessoCriado();
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(processoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        cancelarHandler.handle(new CancelarProcessoCommand(PROCESSO_ID, "Justificativa suficientemente longa", AUTOR));

        ArgumentCaptor<ProcessoAuditChange> changeCaptor = ArgumentCaptor.forClass(ProcessoAuditChange.class);
        verify(auditEventFactory).dataChange(changeCaptor.capture(), any());
        assertThat(changeCaptor.getValue().before()).isNotNull();
        assertThat(changeCaptor.getValue().before().status()).isEqualTo(StatusProcesso.CRIADO);
        assertThat(changeCaptor.getValue().operation()).isEqualTo(ProcessoAuditOperation.CANCEL);
    }

    // === Helpers ===

    private ProcessoDistribuicao criarProcessoCriado() {
        var p = ProcessoDistribuicao.criar("RADIO", "2026-03", BigDecimal.valueOf(93000), AUTOR,
                UUID.randomUUID(), UUID.randomUUID());
        setField(p, "id", PROCESSO_ID);
        return p;
    }

    private ProcessoDistribuicao criarProcessoCalculado() {
        var p = criarProcessoCriado();
        p.marcarCalculado(100);
        return p;
    }

    private ProcessoDistribuicao criarProcessoAprovado() {
        var p = criarProcessoCalculado();
        p.aprovar();
        return p;
    }

    private ProcessoDistribuicao criarProcessoFinalizado() {
        var p = criarProcessoAprovado();
        p.finalizar();
        return p;
    }

    private ProcessoDistribuicao criarProcessoOrigemFinalizado() {
        var p = ProcessoDistribuicao.criar("RADIO", "2026-02", BigDecimal.valueOf(93000), AUTOR,
                UUID.randomUUID(), UUID.randomUUID());
        setField(p, "id", PROCESSO_ORIGEM_ID);
        p.marcarCalculado(100);
        p.aprovar();
        p.finalizar();
        return p;
    }

    private Credito creditoRetido() {
        Credito credito = Credito.retido(
                PROCESSO_ORIGEM_ID,
                UUID.fromString("00000000-0000-0000-0000-000000000031"),
                "Maria Compositora",
                UUID.fromString("00000000-0000-0000-0000-000000000041"),
                "Meu Bem Querer",
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("100.000000"),
                new BigDecimal("400.00"),
                new BigDecimal("400.00"),
                new BigDecimal("10.000000"),
                MotivoRetencao.TITULAR_SEM_ASSOCIACAO,
                Instant.parse("2026-05-16T10:00:00Z"),
                Instant.parse("2026-05-16T10:00:00Z"));
        setField(credito, "id", CREDITO_ID);
        return credito;
    }

    private AuditContext auditContext() {
        return new AuditContext(AUTOR, AUTOR, AUTOR, List.of(), "test",
                null, null, "trace", "req", null, null, null, null, null, null, "WEB");
    }

    private AuditEvent mockAuditEvent() {
        return new AuditEvent(UUID.randomUUID().toString(), 1,
                br.org.ecad.audit.contract.EventType.USER_ACTION, java.time.OffsetDateTime.now(),
                null, null, null, null, null, null, null, null,
                new AuditEvent.UserAction("TEST_ACTION", "Test Action", java.util.Map.of()));
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to set field " + fieldName, e);
        }
    }
}
