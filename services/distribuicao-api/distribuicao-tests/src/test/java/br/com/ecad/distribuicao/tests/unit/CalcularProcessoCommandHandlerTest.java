package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
import br.com.ecad.distribuicao.application.audit.GenericAuditEventFactory;
import br.com.ecad.distribuicao.application.commands.CalcularProcessoCommand;
import br.com.ecad.distribuicao.application.commands.handlers.CalcularProcessoCommandHandler;
import br.com.ecad.distribuicao.application.dto.CalcularProcessoResponse;
import br.com.ecad.distribuicao.application.services.AjusteEstornoAplicacaoService;
import br.com.ecad.distribuicao.application.services.CreditoRetidoLiberacaoService;
import br.com.ecad.distribuicao.application.services.CreditoRetidoLiberacaoService.ResultadoLiberacaoRetidos;
import br.com.ecad.distribuicao.application.services.ResultadoAjustesEstorno;
import br.com.ecad.distribuicao.application.services.RolPayloadParser;
import br.com.ecad.distribuicao.domain.calculo.FonogramaOwnership;
import br.com.ecad.distribuicao.domain.calculo.ObraOwnership;
import br.com.ecad.distribuicao.domain.calculo.OwnershipSnapshot;
import br.com.ecad.distribuicao.domain.calculo.ParticipacaoOwnership;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.OutboxEvent;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.interfaces.CadastroOwnershipClient;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotRolRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotVerbaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import br.org.ecad.audit.sdk.AuditClient;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class CalcularProcessoCommandHandlerTest {

    private static final UUID PROCESSO_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID SNAPSHOT_ROL_ID = UUID.fromString("00000000-0000-0000-0000-000000000011");
    private static final UUID SNAPSHOT_VERBA_ID = UUID.fromString("00000000-0000-0000-0000-000000000012");
    private static final UUID OBRA_A_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID OBRA_B_ID = UUID.fromString("00000000-0000-0000-0000-000000000102");
    private static final UUID FONOGRAMA_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");
    private static final UUID TITULAR_A_ID = UUID.fromString("00000000-0000-0000-0000-000000000301");
    private static final UUID TITULAR_B_ID = UUID.fromString("00000000-0000-0000-0000-000000000302");
    private static final String TOKEN = "Bearer analyst-token";

    @Mock
    private ProcessoRepository processoRepository;

    @Mock
    private SnapshotRolRepository snapshotRolRepository;

    @Mock
    private SnapshotVerbaRepository snapshotVerbaRepository;

    @Mock
    private CadastroOwnershipClient cadastroOwnershipClient;

    @Mock
    private CreditoRepository creditoRepository;

    @Mock
    private CreditoRetidoLiberacaoService creditoRetidoLiberacaoService;

    @Mock
    private AjusteEstornoAplicacaoService ajusteEstornoAplicacaoService;

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private AuditClient auditClient;

    @Mock
    private GenericAuditEventFactory auditFactory;

    @Mock
    private AuditContextProvider auditContextProvider;

    private CalcularProcessoCommandHandler handler;
    private SimpleMeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        meterRegistry = new SimpleMeterRegistry();
        handler = new CalcularProcessoCommandHandler(
                processoRepository,
                snapshotRolRepository,
                snapshotVerbaRepository,
                cadastroOwnershipClient,
                creditoRepository,
                creditoRetidoLiberacaoService,
                ajusteEstornoAplicacaoService,
                outboxEventRepository,
                new RolPayloadParser(objectMapper),
                objectMapper,
                meterRegistry,
                auditClient,
                auditFactory,
                auditContextProvider);
        org.mockito.Mockito.lenient()
                .when(creditoRetidoLiberacaoService.preverLiberacoes(any(), any()))
                .thenReturn(ResultadoLiberacaoRetidos.empty());
        org.mockito.Mockito.lenient()
                .when(creditoRetidoLiberacaoService.cancelarLiberacoesPrevistas(any(), any()))
                .thenReturn(0);
        org.mockito.Mockito.lenient()
                .when(ajusteEstornoAplicacaoService.preverAjustes(any(), any()))
                .thenReturn(ResultadoAjustesEstorno.empty());
        org.mockito.Mockito.lenient()
                .doNothing()
                .when(ajusteEstornoAplicacaoService).validarCalculoPermitido(any());
    }

    @Test
    void handle_WithUnknownProcess_ShouldThrowNotFoundException() {
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler.handle(command()))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Processo de distribuição não encontrado");
    }

    @ParameterizedTest
    @EnumSource(value = StatusProcesso.class, names = {"CALCULADO", "APROVADO", "FINALIZADO", "CANCELADO"})
    void handle_WithNonCriadoStatus_ShouldThrowPreRequisitosException(StatusProcesso status) {
        ProcessoDistribuicao processo = processo(status);
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));

        assertThatThrownBy(() -> handler.handle(command()))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Status atual: " + status);
        verify(cadastroOwnershipClient, never()).buscarOwnership(any(), any(), any());
    }

    @Test
    void handle_WithDuplicatedRolExecutions_ShouldCallCadastroOnceWithUniqueIds() {
        givenSuccessfulCalculation(rolPayloadWithDuplicates());

        handler.handle(command());

        verify(cadastroOwnershipClient).buscarOwnership(
                Set.of(OBRA_A_ID, OBRA_B_ID),
                Set.of(FONOGRAMA_ID),
                TOKEN);
    }

    @Test
    void handle_WithSuccessfulCalculation_ShouldDeleteCreditsBeforeSavingReplacementCredits() {
        givenSuccessfulCalculation(rolPayloadWithDuplicates());

        handler.handle(command());

        InOrder inOrder = inOrder(creditoRepository, processoRepository, outboxEventRepository);
        inOrder.verify(creditoRepository).deleteByProcessoId(PROCESSO_ID);
        inOrder.verify(creditoRepository).saveAll(any());
        inOrder.verify(processoRepository).save(any(ProcessoDistribuicao.class));
        inOrder.verify(outboxEventRepository).save(any(OutboxEvent.class));
    }

    @Test
    void handle_WithSuccessfulCalculation_ShouldPersistCalculatedOutboxEventAndSummaryResponse() {
        givenSuccessfulCalculation(rolPayloadWithDuplicates());
        ArgumentCaptor<OutboxEvent> eventCaptor = ArgumentCaptor.forClass(OutboxEvent.class);

        CalcularProcessoResponse response = handler.handle(command());

        verify(outboxEventRepository).save(eventCaptor.capture());
        OutboxEvent event = eventCaptor.getValue();
        assertThat(event.getType()).isEqualTo("distribuicao.processo.calculado");
        assertThat(event.getSubject()).isEqualTo(PROCESSO_ID.toString());
        assertThat(event.getPayload()).contains("\"processoId\":\"" + PROCESSO_ID + "\"");
        assertThat(response.status()).isEqualTo(StatusProcesso.CALCULADO);
        assertThat(response.totalCreditos()).isEqualTo(3);
        assertThat(response.valorTotalCalculado()).isEqualByComparingTo("1000.00");
        assertThat(response.totalCreditosRetidos()).isZero();
        assertThat(response.valorTotalRetido()).isEqualByComparingTo("0.00");
    }

    @Test
    void handle_WithRetainedCredits_ShouldPersistRetainedOutboxEventsAndMetrics() {
        givenCalculationWithRetainedCredit();
        ArgumentCaptor<OutboxEvent> eventCaptor = ArgumentCaptor.forClass(OutboxEvent.class);

        CalcularProcessoResponse response = handler.handle(new CalcularProcessoCommand(
                PROCESSO_ID,
                "analista",
                TOKEN));

        verify(outboxEventRepository, org.mockito.Mockito.times(2)).save(eventCaptor.capture());
        assertThat(eventCaptor.getAllValues())
                .extracting(OutboxEvent::getType)
                .containsExactlyInAnyOrder("distribuicao.processo.calculado", "distribuicao.credito.retido");
        OutboxEvent retido = eventCaptor.getAllValues().stream()
                .filter(event -> event.getType().equals("distribuicao.credito.retido"))
                .findFirst()
                .orElseThrow();
        assertThat(retido.getPayload())
                .contains("\"processoId\":\"" + PROCESSO_ID + "\"")
                .contains("\"motivoRetencao\":\"TITULAR_SEM_ASSOCIACAO\"");
        assertThat(response.totalCreditosRetidos()).isEqualTo(1);
        assertThat(response.valorTotalRetido()).isEqualByComparingTo("1000.00");
        assertThat(meterRegistry.get("distribuicao.retencao.creditos.generated")
                        .tag("motivo", MotivoRetencao.TITULAR_SEM_ASSOCIACAO.name())
                        .counter()
                        .count())
                .isEqualTo(1.0);
    }

    @Test
    void handle_WithSuccessfulCalculation_ShouldIncrementGeneratedCreditsMetric() {
        givenSuccessfulCalculation(rolPayloadWithDuplicates());

        handler.handle(command());

        assertThat(meterRegistry.get("distribuicao.calculo.creditos.generated").counter().count())
                .isEqualTo(3.0);
        assertThat(meterRegistry.get("distribuicao.calculo.duration").tag("outcome", "success").timer().count())
                .isOne();
    }

    @Test
    void handle_WithBusinessPreconditionFailure_ShouldIncrementBusinessFailureMetric() {
        ProcessoDistribuicao processo = processo(StatusProcesso.CALCULADO);
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));

        assertThatThrownBy(() -> handler.handle(command()))
                .isInstanceOf(PreRequisitosException.class);

        assertThat(meterRegistry.get("distribuicao.calculo.failures")
                        .tag("type", "business-failure")
                        .counter()
                        .count())
                .isEqualTo(1.0);
        assertThat(meterRegistry.get("distribuicao.calculo.duration").tag("outcome", "failure").timer().count())
                .isOne();
    }

    @Test
    void handle_WithSuccessfulCalculation_ShouldLogStructuredSupportContextWithoutHolderPersonalData(
            CapturedOutput output) {
        givenSuccessfulCalculation(rolPayloadWithDuplicates());

        handler.handle(command());

        assertThat(output).contains(
                "distribuicao.calculo.started",
                "distribuicao.calculo.succeeded",
                "processoId=" + PROCESSO_ID,
                "rubricaSigla=RADIO",
                "periodo=2026-05",
                "totalExecucoes=10",
                "totalObras=2",
                "totalCreditos=3",
                "valorTotalCalculado=1000.00",
                "totalCreditosRetidos=0",
                "valorTotalRetido=0.00",
                "durationMs=");
        assertThat(output).doesNotContain("Titular Autoral", "Titular Conexo");
    }

    @Test
    void handle_WithMissingCadastroOwnership_ShouldPropagateBusinessPrecondition() {
        ProcessoDistribuicao processo = processo(StatusProcesso.CRIADO);
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(snapshotRolRepository.findById(SNAPSHOT_ROL_ID)).thenReturn(Optional.of(snapshotRol(rolPayloadSingleObra())));
        when(snapshotVerbaRepository.findById(SNAPSHOT_VERBA_ID)).thenReturn(Optional.of(snapshotVerba()));
        when(cadastroOwnershipClient.buscarOwnership(Set.of(OBRA_A_ID), Set.of(), TOKEN))
                .thenReturn(new OwnershipSnapshot(List.of(), List.of()));

        assertThatThrownBy(() -> handler.handle(command()))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Titularidade autoral");
    }

    @Test
    void handle_BloqueadoPorAjusteProcessoCriadoDesatualizado_LancaPreRequisitosException() {
        ProcessoDistribuicao processo = processo(StatusProcesso.CRIADO);
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        org.mockito.Mockito.doThrow(
                new br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException(
                        "PROCESSO_CRIADO_DESATUALIZADO"))
                .when(ajusteEstornoAplicacaoService).validarCalculoPermitido(any());

        assertThatThrownBy(() -> handler.handle(command()))
                .isInstanceOf(br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException.class)
                .hasMessageContaining("PROCESSO_CRIADO_DESATUALIZADO");
    }

    @Test
    void handle_ComAjustePendente_OutboxCalculadoIncluitotaisAjustesEstorno() {
        givenSuccessfulCalculation(rolPayloadWithDuplicates());
        ResultadoAjustesEstorno resultadoAjustes = new ResultadoAjustesEstorno(
                java.util.List.of(), java.util.List.of(), 1, new java.math.BigDecimal("-85.00"));
        when(ajusteEstornoAplicacaoService.preverAjustes(any(), any())).thenReturn(resultadoAjustes);
        org.mockito.ArgumentCaptor<br.com.ecad.distribuicao.domain.entities.OutboxEvent> eventCaptor =
                org.mockito.ArgumentCaptor.forClass(br.com.ecad.distribuicao.domain.entities.OutboxEvent.class);

        handler.handle(command());

        verify(outboxEventRepository, org.mockito.Mockito.atLeastOnce()).save(eventCaptor.capture());
        br.com.ecad.distribuicao.domain.entities.OutboxEvent calculadoEvent = eventCaptor.getAllValues().stream()
                .filter(e -> e.getType().equals("distribuicao.processo.calculado"))
                .findFirst().orElseThrow();
        assertThat(calculadoEvent.getPayload()).contains("totalAjustesEstorno");
        assertThat(calculadoEvent.getPayload()).contains("valorTotalAjustesEstorno");
    }

    private void givenSuccessfulCalculation(String rolPayload) {
        ProcessoDistribuicao processo = processo(StatusProcesso.CRIADO);
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(snapshotRolRepository.findById(SNAPSHOT_ROL_ID)).thenReturn(Optional.of(snapshotRol(rolPayload)));
        when(snapshotVerbaRepository.findById(SNAPSHOT_VERBA_ID)).thenReturn(Optional.of(snapshotVerba()));
        when(cadastroOwnershipClient.buscarOwnership(any(), any(), any())).thenReturn(ownershipSnapshot());
        when(creditoRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(processoRepository.save(any(ProcessoDistribuicao.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void givenCalculationWithRetainedCredit() {
        ProcessoDistribuicao processo = processo(StatusProcesso.CRIADO);
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(snapshotRolRepository.findById(SNAPSHOT_ROL_ID)).thenReturn(Optional.of(snapshotRol(rolPayloadSingleObra())));
        when(snapshotVerbaRepository.findById(SNAPSHOT_VERBA_ID)).thenReturn(Optional.of(snapshotVerba()));
        when(cadastroOwnershipClient.buscarOwnership(any(), any(), any())).thenReturn(new OwnershipSnapshot(
                List.of(new ObraOwnership(
                        OBRA_A_ID,
                        "Obra A",
                        "LIBERADA",
                        List.of(autoralSemAssociacao(TITULAR_A_ID)))),
                List.of()));
        when(creditoRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(processoRepository.save(any(ProcessoDistribuicao.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private CalcularProcessoCommand command() {
        return new CalcularProcessoCommand(PROCESSO_ID, "analista", TOKEN);
    }

    private ProcessoDistribuicao processo(StatusProcesso status) {
        ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                "RADIO",
                "2026-05",
                new BigDecimal("1000.00"),
                "analista",
                SNAPSHOT_ROL_ID,
                SNAPSHOT_VERBA_ID);
        setField(processo, "id", PROCESSO_ID);
        if (status == StatusProcesso.CALCULADO) {
            processo.marcarCalculado(1, 1, new BigDecimal("1.000000"), 1, new BigDecimal("1000.00"));
        }
        if (status == StatusProcesso.APROVADO) {
            processo.marcarCalculado(1, 1, new BigDecimal("1.000000"), 1, new BigDecimal("1000.00"));
            processo.aprovar();
        }
        if (status == StatusProcesso.FINALIZADO) {
            processo.marcarCalculado(1, 1, new BigDecimal("1.000000"), 1, new BigDecimal("1000.00"));
            processo.aprovar();
            processo.finalizar();
        }
        if (status == StatusProcesso.CANCELADO) {
            processo.cancelar("cancelado");
        }
        return processo;
    }

    private SnapshotRol snapshotRol(String payload) {
        SnapshotRol snapshotRol = new SnapshotRol(
                "RADIO",
                "2026-05",
                UUID.randomUUID(),
                3,
                payload,
                false,
                Instant.parse("2026-05-07T10:15:30Z"));
        setField(snapshotRol, "id", SNAPSHOT_ROL_ID);
        return snapshotRol;
    }

    private SnapshotVerba snapshotVerba() {
        SnapshotVerba snapshotVerba = new SnapshotVerba(
                "RADIO",
                "2026-05",
                new BigDecimal("1200.00"),
                new BigDecimal("100.00"),
                new BigDecimal("100.00"),
                new BigDecimal("1000.00"),
                Instant.parse("2026-05-07T10:15:30Z"));
        setField(snapshotVerba, "id", SNAPSHOT_VERBA_ID);
        return snapshotVerba;
    }

    private OwnershipSnapshot ownershipSnapshot() {
        return new OwnershipSnapshot(
                List.of(
                        new ObraOwnership(OBRA_A_ID, "Obra A", "LIBERADA", List.of(autoral(TITULAR_A_ID))),
                        new ObraOwnership(OBRA_B_ID, "Obra B", "LIBERADA", List.of(autoral(TITULAR_A_ID)))),
                List.of(new FonogramaOwnership(FONOGRAMA_ID, OBRA_A_ID, "LIBERADO", List.of(conexo(TITULAR_B_ID)))));
    }

    private ParticipacaoOwnership autoral(UUID titularId) {
        return new ParticipacaoOwnership(
                titularId,
                "Titular Autoral",
                "UBC",
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("100.0000"));
    }

    private ParticipacaoOwnership autoralSemAssociacao(UUID titularId) {
        return new ParticipacaoOwnership(
                titularId,
                "Titular Autoral",
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("100.0000"));
    }

    private ParticipacaoOwnership conexo(UUID titularId) {
        return new ParticipacaoOwnership(
                titularId,
                "Titular Conexo",
                "UBC",
                CategoriaCredito.CONEXO,
                SubcategoriaConexa.INTERPRETE,
                new BigDecimal("100.0000"));
    }

    private String rolPayloadWithDuplicates() {
        return """
                {
                  "Execucoes": [
                    {"ObraId": "%s", "FonogramaId": "%s", "Quantidade": 2, "Peso": 1.0, "ObraTitulo": "Obra A"},
                    {"ObraId": "%s", "FonogramaId": "%s", "Quantidade": 3, "Peso": 1.0, "ObraTitulo": "Obra A"},
                    {"ObraId": "%s", "Quantidade": 5, "Peso": 1.0, "ObraTitulo": "Obra B"}
                  ]
                }
                """.formatted(OBRA_A_ID, FONOGRAMA_ID, OBRA_A_ID, FONOGRAMA_ID, OBRA_B_ID);
    }

    private String rolPayloadSingleObra() {
        return """
                {"Execucoes": [{"ObraId": "%s", "Quantidade": 1, "Peso": 1.0, "ObraTitulo": "Obra A"}]}
                """.formatted(OBRA_A_ID);
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException("Failed to set test field " + fieldName, exception);
        }
    }
}
