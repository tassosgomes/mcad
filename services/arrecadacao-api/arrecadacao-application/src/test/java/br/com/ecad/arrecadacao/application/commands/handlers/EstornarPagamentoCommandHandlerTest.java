package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.GenericAuditEventFactory;
import br.com.ecad.arrecadacao.application.commands.EstornarPagamentoCommand;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.exceptions.VerbaEmDistribuicaoException;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import br.org.ecad.audit.sdk.AuditClient;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EstornarPagamentoCommandHandlerTest {

    @Mock private PagamentoRepository pagamentoRepository;
    @Mock private VerbaService verbaService;
    @Mock private OutboxEventWriter outboxEventWriter;
    @Mock private AuditClient auditClient;
    @Mock private GenericAuditEventFactory auditFactory;
    @Mock private AuditContextProvider auditContextProvider;

    @InjectMocks
    private EstornarPagamentoCommandHandler handler;

    private static final UUID PAGAMENTO_ID = UUID.randomUUID();
    private static final UUID LICENCA_ID = UUID.randomUUID();
    private static final String JUSTIFICATIVA = "Pagamento registrado em duplicidade com valor incorreto.";
    private static final String AUTOR = "analista@ecad.org.br";

    private static final UUID RUBRICA_ID = UUID.randomUUID();

    /**
     * Cria um Pagamento real com Licenca mockada (join @ManyToOne lazy).
     * Necessário porque getLicenca().getRubricaId() e getLicenca().getRubrica().getSigla()
     * são chamados no handler.
     */
    private Pagamento criarPagamentoComLicencaMock() {
        Rubrica rubricaMock = mock(Rubrica.class);
        when(rubricaMock.getSigla()).thenReturn("RADIO");

        Licenca licencaMock = mock(Licenca.class);
        when(licencaMock.getRubrica()).thenReturn(rubricaMock);
        when(licencaMock.getRubricaId()).thenReturn(RUBRICA_ID);
        when(licencaMock.getUsuarioMusica()).thenReturn(null);
        when(licencaMock.getStatus()).thenReturn(br.com.ecad.arrecadacao.domain.enums.StatusLicenca.ATIVA);
        when(licencaMock.getId()).thenReturn(LICENCA_ID);

        // Criar pagamento real (para que estornar() funcione)
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, new BigDecimal("2.5"), new BigDecimal("107.31"));

        // Criar spy para injetar licença mockada
        Pagamento spy = spy(pagamento);
        doReturn(licencaMock).when(spy).getLicenca();

        return spy;
    }

    @Test
    void handle_WithValidCommand_ShouldEstornarAndPublishEvent() {
        // Arrange
        Pagamento pagamento = criarPagamentoComLicencaMock();
        when(pagamentoRepository.findById(PAGAMENTO_ID)).thenReturn(Optional.of(pagamento));
        when(pagamentoRepository.save(any(Pagamento.class))).thenAnswer(inv -> inv.getArgument(0));

        EstornarPagamentoCommand cmd = new EstornarPagamentoCommand(PAGAMENTO_ID, JUSTIFICATIVA, AUTOR);

        // Act
        PagamentoResponse response = handler.handle(cmd);

        // Assert — campos do response
        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("ESTORNADO");
        assertThat(response.justificativaEstorno()).isEqualTo(JUSTIFICATIVA);
        assertThat(response.estornadoPor()).isEqualTo(AUTOR);
        assertThat(response.estornadoEm()).isNotNull();

        // Verify — evento Outbox publicado
        verify(outboxEventWriter).addEvent(
            eq("arrecadacao.pagamento.estornado"), anyString(), any());

        // Verify — VerbaService.recalcularVerba chamado com rubricaId (UUID)
        verify(verbaService).recalcularVerba(eq(RUBRICA_ID), anyString());
    }

    @Test
    void handle_WithPagamentoNotFound_ShouldThrow404() {
        // Arrange
        when(pagamentoRepository.findById(PAGAMENTO_ID)).thenReturn(Optional.empty());
        EstornarPagamentoCommand cmd = new EstornarPagamentoCommand(PAGAMENTO_ID, JUSTIFICATIVA, AUTOR);

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(cmd))
            .isInstanceOf(EntidadeNaoEncontradaException.class)
            .hasMessageContaining("nao encontrado");

        verify(pagamentoRepository, never()).save(any());
        verify(outboxEventWriter, never()).addEvent(any(), any(), any());
    }

    @Test
    void handle_WithPagamentoJaEstornado_ShouldThrow422() {
        // Arrange — criar pagamento já estornado
        Pagamento pagamento = criarPagamentoComLicencaMock();
        pagamento.estornar(JUSTIFICATIVA, AUTOR); // primeiro estorno válido
        when(pagamentoRepository.findById(PAGAMENTO_ID)).thenReturn(Optional.of(pagamento));

        EstornarPagamentoCommand cmd = new EstornarPagamentoCommand(PAGAMENTO_ID, JUSTIFICATIVA, AUTOR);

        // Act & Assert — domain guard lança IllegalStateException (mapeado para 422)
        assertThatThrownBy(() -> handler.handle(cmd))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("CONFIRMADOS");

        verify(pagamentoRepository, never()).save(any());
        verify(outboxEventWriter, never()).addEvent(any(), any(), any());
    }

    @Test
    void handle_WithVerbaEmDistribuicao_ShouldThrow422() {
        // Arrange — VerbaService lança VerbaEmDistribuicaoException
        Pagamento pagamento = criarPagamentoComLicencaMock();
        when(pagamentoRepository.findById(PAGAMENTO_ID)).thenReturn(Optional.of(pagamento));
        doThrow(new VerbaEmDistribuicaoException("Verba em distribuicao para o periodo"))
            .when(verbaService).validarLockParaAlteracao(any(), any());

        EstornarPagamentoCommand cmd = new EstornarPagamentoCommand(PAGAMENTO_ID, JUSTIFICATIVA, AUTOR);

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(cmd))
            .isInstanceOf(VerbaEmDistribuicaoException.class)
            .hasMessageContaining("distribuicao");

        verify(pagamentoRepository, never()).save(any());
        verify(outboxEventWriter, never()).addEvent(any(), any(), any());
    }

    @Test
    void handle_ShouldCallValidarLockBeforeEstornar() {
        // Arrange
        Pagamento pagamento = criarPagamentoComLicencaMock();
        when(pagamentoRepository.findById(PAGAMENTO_ID)).thenReturn(Optional.of(pagamento));
        when(pagamentoRepository.save(any(Pagamento.class))).thenAnswer(inv -> inv.getArgument(0));

        EstornarPagamentoCommand cmd = new EstornarPagamentoCommand(PAGAMENTO_ID, JUSTIFICATIVA, AUTOR);

        // Act
        handler.handle(cmd);

        // Assert — verificar ordem: validarLock ANTES de save
        InOrder inOrder = inOrder(verbaService, pagamentoRepository);
        inOrder.verify(verbaService).validarLockParaAlteracao(any(), any());
        inOrder.verify(pagamentoRepository).save(any());
    }
}
