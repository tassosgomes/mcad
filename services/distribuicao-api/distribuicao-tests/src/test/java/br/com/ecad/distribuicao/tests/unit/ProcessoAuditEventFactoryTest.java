package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.ecad.distribuicao.application.audit.AuditContext;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditChange;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditEventFactory;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditOperation;
import br.com.ecad.distribuicao.application.audit.ProcessoSnapshot;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.org.ecad.audit.contract.AuditEvent;
import br.org.ecad.audit.contract.EventType;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class ProcessoAuditEventFactoryTest {

    private static final String PROCESSO_ID = "11111111-1111-1111-1111-111111111111";

    private ProcessoAuditEventFactory factory;
    private ProcessoDistribuicao processo;
    private AuditContext auditContext;

    @BeforeEach
    void setUp() {
        factory = new ProcessoAuditEventFactory();
        processo = ProcessoDistribuicao.criar("RADIO", "2026-03", BigDecimal.valueOf(85000),
                "analista@ecad.org", UUID.randomUUID(), UUID.randomUUID());
        setField(processo, "id", UUID.fromString(PROCESSO_ID));

        auditContext = new AuditContext("user-id", "analista@ecad.org", "Analista ECAD",
                List.of("ROLE_analista"), "oidc",
                "127.0.0.1", "Mozilla/5.0", "trace-id", "req-id",
                "sess-id", "screen-access-id", "cmd-id",
                "DISTRIBUICAO_PROCESSOS", "Processos de Distribuição",
                "/api/v1/processos", "WEB");
    }

    @ParameterizedTest
    @EnumSource(ProcessoAuditOperation.class)
    void userAction_ParaCadaOperacao_ShouldTerEventTypeCorreto(ProcessoAuditOperation operation) {
        AuditEvent event = factory.userAction(processo, auditContext, operation);

        assertThat(event).isNotNull();
        assertThat(event.eventType()).isEqualTo(EventType.USER_ACTION);
        assertThat(event.action()).isNotNull();
        // action.name() contém o actionCode (ex: PROCESSO_DISTRIBUICAO_CREATE)
        assertThat(event.action().name()).isEqualTo(operation.code());
        assertThat(event.action().name()).startsWith("PROCESSO_DISTRIBUICAO_");
        assertThat(event.actor().username()).isEqualTo("analista@ecad.org");
    }

    @Test
    void userAction_CREATE_ShouldTerActionCodeCorreto() {
        AuditEvent event = factory.userAction(processo, auditContext, ProcessoAuditOperation.CREATE);

        assertThat(event.action().name()).isEqualTo("PROCESSO_DISTRIBUICAO_CREATE");
    }

    @Test
    void userAction_APPROVE_ShouldTerActionCodeCorreto() {
        AuditEvent event = factory.userAction(processo, auditContext, ProcessoAuditOperation.APPROVE);

        assertThat(event.action().name()).isEqualTo("PROCESSO_DISTRIBUICAO_APPROVE");
    }

    @Test
    void dataChange_CREATE_ComBeforeNull_ShouldTerBeforeNullEAfterNaoNull() {
        AuditEvent event = factory.dataChange(
                new ProcessoAuditChange(processo, ProcessoAuditOperation.CREATE, null),
                auditContext);

        assertThat(event.eventType()).isEqualTo(EventType.DATA_CHANGE);
        assertThat(event.data()).isNotNull();
        assertThat(event.data().before()).isNull();
        assertThat(event.data().after()).isNotNull();
        assertThat(event.data().entityId()).isEqualTo(PROCESSO_ID);
        assertThat(event.data().entityType()).isEqualTo("ProcessoDistribuicao");
    }

    @Test
    void dataChange_APPROVE_ComBeforeEAfter_ShouldCapturarEstados() {
        // Capturar before antes de aprovar
        processo.marcarCalculado(100);
        ProcessoSnapshot before = ProcessoSnapshot.from(processo);
        processo.aprovar();

        AuditEvent event = factory.dataChange(
                new ProcessoAuditChange(processo, ProcessoAuditOperation.APPROVE, before),
                auditContext);

        assertThat(event.data().before()).isNotNull();
        assertThat(event.data().before().get("status")).isEqualTo("CALCULADO");
        assertThat(event.data().after()).isNotNull();
        assertThat(event.data().after().get("status")).isEqualTo("APROVADO");
    }

    @Test
    void dataChange_CANCEL_ShouldConterJustificativaNaAfter() {
        ProcessoSnapshot before = ProcessoSnapshot.from(processo);
        processo.cancelar("Justificativa de cancelamento longa o suficiente");

        AuditEvent event = factory.dataChange(
                new ProcessoAuditChange(processo, ProcessoAuditOperation.CANCEL, before),
                auditContext);

        assertThat(event.data().after()).containsKey("justificativaCancelamento");
        assertThat(event.data().after().get("justificativaCancelamento"))
                .isEqualTo("Justificativa de cancelamento longa o suficiente");
    }

    @Test
    void dataChange_ShouldConterAggregateIdCorreto() {
        AuditEvent event = factory.dataChange(
                new ProcessoAuditChange(processo, ProcessoAuditOperation.CREATE, null),
                auditContext);

        assertThat(event.data().entityId()).isEqualTo(PROCESSO_ID);
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
