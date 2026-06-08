package br.com.ecad.distribuicao.tests.unit;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import br.com.ecad.distribuicao.infra.events.PagamentoEstornadoEventHandler;
import br.com.ecad.distribuicao.infra.events.PagamentoEstornadoEventListener;
import br.com.ecad.distribuicao.infra.events.PagamentoEstornadoEventPayload;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;

@ExtendWith(MockitoExtension.class)
class PagamentoEstornadoEventListenerTest {

    @Mock
    private PagamentoEstornadoEventHandler handler;

    private PagamentoEstornadoEventListener listener;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        listener = new PagamentoEstornadoEventListener(objectMapper, handler);
    }

    @Test
    void onMessage_EventoValidoCompleto_HandleChamadoComPayloadCorreto() {
        Message message = message(cloudEventValido());

        listener.onMessage(message);

        verify(handler).handle(any(PagamentoEstornadoEventPayload.class), anyString());
    }

    @Test
    void onMessage_SemSpecversion_HandleNaoChamado() {
        // Build JSON without specversion field entirely
        String json = """
                {
                  "type": "arrecadacao.pagamento.estornado",
                  "source": "arrecadacao-api",
                  "id": "aaaaaaaa-0000-0000-0000-000000000001",
                  "subject": "bbbbbbbb-0000-0000-0000-000000000001",
                  "time": "2026-06-01T10:00:00Z",
                  "datacontenttype": "application/json",
                  "data": {
                    "pagamentoId": "bbbbbbbb-0000-0000-0000-000000000001",
                    "licencaId": "cccccccc-0000-0000-0000-000000000001",
                    "rubricaSigla": "RADIO",
                    "periodo": "2026-04",
                    "quantidadeUdas": "10.000000",
                    "valorEstornado": "100.00",
                    "justificativa": "Cancelamento de licença",
                    "estornadoPor": "analista@ecad.org",
                    "estornadoEm": "2026-06-01T10:00:00Z"
                  }
                }
                """;
        Message message = message(json);

        listener.onMessage(message);

        verify(handler, never()).handle(any(), anyString());
    }

    @Test
    void onMessage_TypeErrado_HandleNaoChamado() {
        String json = """
                {
                  "specversion": "1.0",
                  "type": "arrecadacao.pagamento.liquidado",
                  "source": "arrecadacao-api",
                  "id": "aaaaaaaa-0000-0000-0000-000000000001",
                  "subject": "bbbbbbbb-0000-0000-0000-000000000001",
                  "time": "2026-06-01T10:00:00Z",
                  "datacontenttype": "application/json",
                  "data": {
                    "pagamentoId": "bbbbbbbb-0000-0000-0000-000000000001",
                    "licencaId": "cccccccc-0000-0000-0000-000000000001",
                    "rubricaSigla": "RADIO",
                    "periodo": "2026-04",
                    "quantidadeUdas": "10.000000",
                    "valorEstornado": "100.00",
                    "justificativa": "Cancelamento de licença",
                    "estornadoPor": "analista@ecad.org",
                    "estornadoEm": "2026-06-01T10:00:00Z"
                  }
                }
                """;
        Message message = message(json);

        listener.onMessage(message);

        verify(handler, never()).handle(any(), anyString());
    }

    @Test
    void onMessage_FaltaRubricaSigla_HandleNaoChamado() {
        String json = """
                {
                  "specversion": "1.0",
                  "type": "arrecadacao.pagamento.estornado",
                  "source": "arrecadacao-api",
                  "id": "aaaaaaaa-0000-0000-0000-000000000001",
                  "subject": "bbbbbbbb-0000-0000-0000-000000000001",
                  "time": "2026-06-01T10:00:00Z",
                  "datacontenttype": "application/json",
                  "data": {
                    "pagamentoId": "bbbbbbbb-0000-0000-0000-000000000001",
                    "licencaId": "cccccccc-0000-0000-0000-000000000001",
                    "periodo": "2026-04",
                    "quantidadeUdas": "10.000000",
                    "valorEstornado": "100.00",
                    "justificativa": "Cancelamento de licença",
                    "estornadoPor": "analista@ecad.org",
                    "estornadoEm": "2026-06-01T10:00:00Z"
                  }
                }
                """;
        Message message = message(json);

        listener.onMessage(message);

        verify(handler, never()).handle(any(), anyString());
    }

    @Test
    void onMessage_ValorEstornadoStringInvalida_HandleNaoChamado() {
        String json = """
                {
                  "specversion": "1.0",
                  "type": "arrecadacao.pagamento.estornado",
                  "source": "arrecadacao-api",
                  "id": "aaaaaaaa-0000-0000-0000-000000000001",
                  "subject": "bbbbbbbb-0000-0000-0000-000000000001",
                  "time": "2026-06-01T10:00:00Z",
                  "datacontenttype": "application/json",
                  "data": {
                    "pagamentoId": "bbbbbbbb-0000-0000-0000-000000000001",
                    "licencaId": "cccccccc-0000-0000-0000-000000000001",
                    "rubricaSigla": "RADIO",
                    "periodo": "2026-04",
                    "quantidadeUdas": "10.000000",
                    "valorEstornado": "nao-decimal",
                    "justificativa": "Cancelamento de licença",
                    "estornadoPor": "analista@ecad.org",
                    "estornadoEm": "2026-06-01T10:00:00Z"
                  }
                }
                """;
        Message message = message(json);

        listener.onMessage(message);

        verify(handler, never()).handle(any(), anyString());
    }

    @Test
    void onMessage_TimeFormatoInvalido_HandleNaoChamado() {
        String json = """
                {
                  "specversion": "1.0",
                  "type": "arrecadacao.pagamento.estornado",
                  "source": "arrecadacao-api",
                  "id": "aaaaaaaa-0000-0000-0000-000000000001",
                  "subject": "bbbbbbbb-0000-0000-0000-000000000001",
                  "time": "2026-06-01T10:00:00Z",
                  "datacontenttype": "application/json",
                  "data": {
                    "pagamentoId": "bbbbbbbb-0000-0000-0000-000000000001",
                    "licencaId": "cccccccc-0000-0000-0000-000000000001",
                    "rubricaSigla": "RADIO",
                    "periodo": "2026-04",
                    "quantidadeUdas": "10.000000",
                    "valorEstornado": "100.00",
                    "justificativa": "Cancelamento de licença",
                    "estornadoPor": "analista@ecad.org",
                    "estornadoEm": "nao-uma-data"
                  }
                }
                """;
        Message message = message(json);

        listener.onMessage(message);

        verify(handler, never()).handle(any(), anyString());
    }

    @Test
    void onMessage_NuncaPropagaException() {
        // JSON completamente inválido — deve ser absorvido
        Message message = message("isso nao e json");

        // deve completar sem lançar exceção
        try {
            listener.onMessage(message);
        } catch (Exception e) {
            throw new AssertionError("onMessage propagou exception: " + e.getMessage(), e);
        }

        verify(handler, never()).handle(any(), anyString());
    }

    @Test
    void onMessage_JsonNullBody_NuncaPropagaException() {
        Message message = message("null");

        try {
            listener.onMessage(message);
        } catch (Exception e) {
            throw new AssertionError("onMessage propagou exception: " + e.getMessage(), e);
        }

        verify(handler, never()).handle(any(), anyString());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Message message(String json) {
        return new Message(json.getBytes(), new MessageProperties());
    }

    private String cloudEventValido() {
        UUID eventId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
        UUID pagamentoId = UUID.fromString("bbbbbbbb-0000-0000-0000-000000000001");
        UUID licencaId = UUID.fromString("cccccccc-0000-0000-0000-000000000001");
        return """
                {
                  "specversion": "1.0",
                  "type": "arrecadacao.pagamento.estornado",
                  "source": "arrecadacao-api",
                  "id": "%s",
                  "subject": "%s",
                  "time": "2026-06-01T10:00:00Z",
                  "datacontenttype": "application/json",
                  "data": {
                    "pagamentoId": "%s",
                    "licencaId": "%s",
                    "rubricaSigla": "RADIO",
                    "periodo": "2026-04",
                    "quantidadeUdas": "10.000000",
                    "valorEstornado": "100.00",
                    "justificativa": "Cancelamento de licença",
                    "estornadoPor": "analista@ecad.org",
                    "estornadoEm": "2026-06-01T10:00:00Z"
                  }
                }
                """.formatted(eventId, pagamentoId, pagamentoId, licencaId);
    }
}
