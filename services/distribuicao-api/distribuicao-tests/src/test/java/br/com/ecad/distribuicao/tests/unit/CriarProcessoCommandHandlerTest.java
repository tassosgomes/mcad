package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.application.audit.AuditContext;
import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditEventFactory;
import br.com.ecad.distribuicao.application.commands.CriarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.handlers.CriarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.ConflictException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotRolRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotVerbaRepository;
import br.org.ecad.audit.contract.AuditEvent;
import br.org.ecad.audit.sdk.AuditClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CriarProcessoCommandHandlerTest {

    private static final String RUBRICA = "RADIO";
    private static final String PERIODO = "2026-03";
    private static final String ANALISTA = "analista@ecad.org";
    private static final UUID ROL_ID = UUID.randomUUID();
    private static final UUID VERBA_ID = UUID.randomUUID();

    @Mock private ProcessoRepository processoRepository;
    @Mock private SnapshotRolRepository snapshotRolRepository;
    @Mock private SnapshotVerbaRepository snapshotVerbaRepository;
    @Mock private OutboxEventWriter outboxEventWriter;
    @Mock private AuditClient auditClient;
    @Mock private AuditContextProvider auditContextProvider;
    @Mock private ProcessoAuditEventFactory auditEventFactory;

    private CriarProcessoCommandHandler handler;

    @BeforeEach
    void setUp() {
        handler = new CriarProcessoCommandHandler(
                processoRepository, snapshotRolRepository, snapshotVerbaRepository,
                outboxEventWriter, auditClient, auditContextProvider, auditEventFactory);
    }

    @Test
    void handle_HappyPath_ShouldCreateProcessoAndPublish2AuditEvents() {
        // Arrange
        givenSnapshotRolDisponivel();
        givenSnapshotVerbaDisponivel();
        when(processoRepository.existsByRubricaSiglaAndPeriodoAndStatusNot(RUBRICA, PERIODO, StatusProcesso.CANCELADO))
                .thenReturn(false);
        when(processoRepository.save(any())).thenAnswer(inv -> {
            ProcessoDistribuicao p = inv.getArgument(0);
            setField(p, "id", UUID.randomUUID()); // simulate JPA id generation
            return p;
        });
        when(auditContextProvider.current(ANALISTA)).thenReturn(auditContext());
        when(auditEventFactory.userAction(any(), any(), any())).thenReturn(mockAuditEvent());
        when(auditEventFactory.dataChange(any(), any())).thenReturn(mockAuditEvent());

        // Act
        ProcessoResponse response = handler.handle(new CriarProcessoCommand(RUBRICA, PERIODO, ANALISTA));

        // Assert
        assertThat(response.status()).isEqualTo(StatusProcesso.CRIADO);
        assertThat(response.rubricaSigla()).isEqualTo(RUBRICA);
        assertThat(response.periodo()).isEqualTo(PERIODO);

        verify(outboxEventWriter).addEvent(eq("distribuicao.processo.iniciado"), any(), any());
        verify(auditClient, times(2)).publish(any(AuditEvent.class));
    }

    @Test
    void handle_SemRol_ShouldThrowPreRequisitosException() {
        when(snapshotRolRepository.findByRubricaSiglaAndPeriodo(RUBRICA, PERIODO)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler.handle(new CriarProcessoCommand(RUBRICA, PERIODO, ANALISTA)))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Rol");

        verify(processoRepository, never()).save(any());
        verify(auditClient, never()).publish(any());
    }

    @Test
    void handle_SemVerba_ShouldThrowPreRequisitosException() {
        givenSnapshotRolDisponivel();
        when(snapshotVerbaRepository.findByRubricaSiglaAndPeriodo(RUBRICA, PERIODO)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler.handle(new CriarProcessoCommand(RUBRICA, PERIODO, ANALISTA)))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Verba");

        verify(processoRepository, never()).save(any());
        verify(auditClient, never()).publish(any());
    }

    @Test
    void handle_ProcessoAtivoDuplicado_ShouldThrowConflictException() {
        givenSnapshotRolDisponivel();
        givenSnapshotVerbaDisponivel();
        when(processoRepository.existsByRubricaSiglaAndPeriodoAndStatusNot(RUBRICA, PERIODO, StatusProcesso.CANCELADO))
                .thenReturn(true);

        assertThatThrownBy(() -> handler.handle(new CriarProcessoCommand(RUBRICA, PERIODO, ANALISTA)))
                .isInstanceOf(ConflictException.class);

        verify(processoRepository, never()).save(any());
        verify(auditClient, never()).publish(any());
    }

    @Test
    void handle_HappyPath_DataChangeShouldHaveNullBefore() {
        givenSnapshotRolDisponivel();
        givenSnapshotVerbaDisponivel();
        when(processoRepository.existsByRubricaSiglaAndPeriodoAndStatusNot(RUBRICA, PERIODO, StatusProcesso.CANCELADO))
                .thenReturn(false);
        when(processoRepository.save(any())).thenAnswer(inv -> {
            ProcessoDistribuicao p = inv.getArgument(0);
            setField(p, "id", UUID.randomUUID());
            return p;
        });
        when(auditContextProvider.current(ANALISTA)).thenReturn(auditContext());
        when(auditEventFactory.userAction(any(), any(), any())).thenReturn(mockAuditEvent());
        when(auditEventFactory.dataChange(any(), any())).thenReturn(mockAuditEvent());

        handler.handle(new CriarProcessoCommand(RUBRICA, PERIODO, ANALISTA));

        // Verify dataChange called with before=null
        var changeCaptor = org.mockito.ArgumentCaptor.forClass(
                br.com.ecad.distribuicao.application.audit.ProcessoAuditChange.class);
        verify(auditEventFactory).dataChange(changeCaptor.capture(), any());
        assertThat(changeCaptor.getValue().before()).isNull();
    }

    private void givenSnapshotRolDisponivel() {
        SnapshotRol rol = new SnapshotRol(RUBRICA, PERIODO, UUID.randomUUID(), 100, "{}", false, Instant.now());
        setField(rol, "id", ROL_ID);
        when(snapshotRolRepository.findByRubricaSiglaAndPeriodo(RUBRICA, PERIODO)).thenReturn(Optional.of(rol));
    }

    private void givenSnapshotVerbaDisponivel() {
        SnapshotVerba verba = new SnapshotVerba(RUBRICA, PERIODO, BigDecimal.valueOf(100000),
                BigDecimal.valueOf(5000), BigDecimal.valueOf(2000), BigDecimal.valueOf(93000), Instant.now());
        setField(verba, "id", VERBA_ID);
        when(snapshotVerbaRepository.findByRubricaSiglaAndPeriodo(RUBRICA, PERIODO)).thenReturn(Optional.of(verba));
    }

    private AuditContext auditContext() {
        return new AuditContext(ANALISTA, ANALISTA, ANALISTA, List.of(), "test",
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
            throw new IllegalStateException("Failed to set test field " + fieldName, e);
        }
    }
}
