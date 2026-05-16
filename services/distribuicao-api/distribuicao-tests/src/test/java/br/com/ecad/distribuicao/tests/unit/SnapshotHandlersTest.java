package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotRolRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotVerbaRepository;
import br.com.ecad.distribuicao.infra.events.RolEventHandler;
import br.com.ecad.distribuicao.infra.events.RolEventPayload;
import br.com.ecad.distribuicao.infra.events.VerbaEventHandler;
import br.com.ecad.distribuicao.infra.events.VerbaEventPayload;
import br.org.ecad.audit.sdk.AuditClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SnapshotHandlersTest {

    private static final String RUBRICA = "TV_ABERTA";
    private static final String PERIODO = "2026-04";
    private static final UUID CAPTACAO_ID = UUID.randomUUID();

    @Mock private SnapshotRolRepository rolRepository;
    @Mock private SnapshotVerbaRepository verbaRepository;

    private RolEventHandler rolEventHandler;
    private VerbaEventHandler verbaEventHandler;

    @BeforeEach
    void setUp() {
        rolEventHandler = new RolEventHandler(rolRepository);
        verbaEventHandler = new VerbaEventHandler(verbaRepository);
    }

    // === ROL EVENT HANDLER TESTS ===

    @Test
    void handleRolFechado_SnapshotNaoExistente_ShouldCriarSnapshot() {
        when(rolRepository.findByRubricaSiglaAndPeriodo(RUBRICA, PERIODO)).thenReturn(Optional.empty());
        when(rolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        rolEventHandler.handleRolFechado(rolPayload(false));

        ArgumentCaptor<SnapshotRol> captor = ArgumentCaptor.forClass(SnapshotRol.class);
        verify(rolRepository).save(captor.capture());
        assertThat(captor.getValue().getRubricaSigla()).isEqualTo(RUBRICA);
        assertThat(captor.getValue().getPeriodo()).isEqualTo(PERIODO);
        assertThat(captor.getValue().isCancelado()).isFalse();
    }

    @Test
    void handleRolFechado_SnapshotExistente_ShouldSerIdempotente() {
        SnapshotRol existing = new SnapshotRol(RUBRICA, PERIODO, CAPTACAO_ID, 100, "{}", false, Instant.now());
        when(rolRepository.findByRubricaSiglaAndPeriodo(RUBRICA, PERIODO)).thenReturn(Optional.of(existing));

        rolEventHandler.handleRolFechado(rolPayload(false));

        // Idempotente: não salva novamente quando já existe
        verify(rolRepository, never()).save(any());
    }

    @Test
    void handleRolCancelado_SnapshotExistente_ShouldMarcarComoCancelado() {
        SnapshotRol existing = new SnapshotRol(RUBRICA, PERIODO, CAPTACAO_ID, 100, "{}", false, Instant.now());
        when(rolRepository.findByRubricaSiglaAndPeriodo(RUBRICA, PERIODO)).thenReturn(Optional.of(existing));
        when(rolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        rolEventHandler.handleRolCancelado(rolPayload(true));

        ArgumentCaptor<SnapshotRol> captor = ArgumentCaptor.forClass(SnapshotRol.class);
        verify(rolRepository).save(captor.capture());
        assertThat(captor.getValue().isCancelado()).isTrue();
    }

    @Test
    void handleRolCancelado_SnapshotNaoExistente_ShouldIgnorar() {
        when(rolRepository.findByRubricaSiglaAndPeriodo(RUBRICA, PERIODO)).thenReturn(Optional.empty());

        rolEventHandler.handleRolCancelado(rolPayload(true));

        verify(rolRepository, never()).save(any());
    }

    // === VERBA EVENT HANDLER TESTS ===

    @Test
    void handleVerba_SnapshotNaoExistente_ShouldCriarSnapshot() {
        when(verbaRepository.findByRubricaSiglaAndPeriodo(RUBRICA, PERIODO)).thenReturn(Optional.empty());
        when(verbaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        verbaEventHandler.handleVerbaDisponivel(verbaPayload());

        ArgumentCaptor<SnapshotVerba> captor = ArgumentCaptor.forClass(SnapshotVerba.class);
        verify(verbaRepository).save(captor.capture());
        assertThat(captor.getValue().getRubricaSigla()).isEqualTo(RUBRICA);
        assertThat(captor.getValue().getVerbaLiquida()).isEqualByComparingTo("85000");
    }

    @Test
    void snapshotHandlers_NaoDevemChamarAuditClient() {
        // AuditClient should NOT be called in snapshot handlers — they are event consumers
        // This test ensures no audit dependency exists in the handlers
        // (verify by reflection that AuditClient is NOT a field)
        assertThat(rolEventHandler.getClass().getDeclaredFields())
                .noneMatch(f -> f.getType().getSimpleName().equals("AuditClient"));
        assertThat(verbaEventHandler.getClass().getDeclaredFields())
                .noneMatch(f -> f.getType().getSimpleName().equals("AuditClient"));
    }

    private RolEventPayload rolPayload(boolean cancelado) {
        return new RolEventPayload(RUBRICA, PERIODO, CAPTACAO_ID, 150, "{}");
    }

    private VerbaEventPayload verbaPayload() {
        return new VerbaEventPayload(RUBRICA, PERIODO, BigDecimal.valueOf(100000),
                BigDecimal.valueOf(10000), BigDecimal.valueOf(5000), BigDecimal.valueOf(85000));
    }
}
