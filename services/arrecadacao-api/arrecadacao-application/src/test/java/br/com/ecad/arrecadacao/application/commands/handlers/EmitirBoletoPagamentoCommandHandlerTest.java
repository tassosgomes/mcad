package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContext;
import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.PagamentoAuditEventFactory;
import br.com.ecad.arrecadacao.application.commands.EmitirBoletoPagamentoCommand;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.application.ports.BoletoPdfGenerator;
import br.com.ecad.arrecadacao.application.ports.StorageFileClient;
import br.com.ecad.arrecadacao.application.ports.StorageFileMetadata;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaService;
import br.org.ecad.audit.sdk.AuditClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EmitirBoletoPagamentoCommandHandlerTest {

    @Mock private LicencaRepository licencaRepository;
    @Mock private UdaValorRepository udaValorRepository;
    @Mock private PagamentoRepository pagamentoRepository;
    @Mock private VerbaService verbaService;
    @Mock private BoletoPdfGenerator boletoPdfGenerator;
    @Mock private StorageFileClient storageFileClient;
    @Mock private OutboxEventWriter outboxEventWriter;
    @Mock private AuditClient auditClient;
    @Mock private PagamentoAuditEventFactory auditEventFactory;
    @Mock private AuditContextProvider auditContextProvider;

    @InjectMocks
    private EmitirBoletoPagamentoCommandHandler handler;

    private static final UUID LICENCA_ID = UUID.randomUUID();
    private static final UUID RUBRICA_ID = UUID.randomUUID();
    private static final BigDecimal QUANTIDADE_UDAS = new BigDecimal("2.5");
    private static final BigDecimal VALOR_UDA = new BigDecimal("107.31");

    @Test
    void handle_ComDadosValidos_DeveEmitirBoletoArmazenarPdfENaoRecalcularVerba() {
        Licenca licenca = criarLicencaMock();
        UdaValor uda = UdaValor.criar(VALOR_UDA, LocalDate.of(2026, 1, 1), null);
        LocalDate vencimento = LocalDate.now().plusDays(7);

        when(licencaRepository.findById(LICENCA_ID)).thenReturn(Optional.of(licenca));
        when(udaValorRepository.findVigente(any(LocalDate.class))).thenReturn(Optional.of(uda));
        when(pagamentoRepository.existsAbertoByLicencaIdAndPeriodo(eq(LICENCA_ID), anyString()))
                .thenReturn(false);
        when(boletoPdfGenerator.generate(any())).thenReturn("%PDF-1.4".getBytes());
        when(storageFileClient.upload(any())).thenReturn(new StorageFileMetadata("01KVFAKE", "pending_scan"));
        when(pagamentoRepository.save(any(Pagamento.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(auditContextProvider.current("analista")).thenReturn(AuditContext.system("analista"));

        PagamentoResponse response = handler.handle(new EmitirBoletoPagamentoCommand(
                LICENCA_ID,
                QUANTIDADE_UDAS,
                vencimento,
                br.com.ecad.arrecadacao.application.actor.ActorSnapshots.legacy("analista")));

        assertThat(response.status()).isEqualTo("BOLETO_EMITIDO");
        assertThat(response.boletoStorageFileId()).isEqualTo("01KVFAKE");
        assertThat(response.boletoLinhaDigitavel()).isNotBlank();
        verify(verbaService).validarLockParaAlteracao(eq(RUBRICA_ID), anyString());
        verify(verbaService, never()).recalcularVerba(any(), anyString());
        verify(boletoPdfGenerator).generate(any());
        verify(storageFileClient).upload(any());
        verify(outboxEventWriter).addEvent(eq("arrecadacao.pagamento.boleto-emitido"), anyString(), any());
        verify(auditClient, times(2)).publish(any());
    }

    private Licenca criarLicencaMock() {
        Rubrica rubrica = org.mockito.Mockito.mock(Rubrica.class);
        when(rubrica.getSigla()).thenReturn("RADIO");
        when(rubrica.getNome()).thenReturn("Radio");
        when(rubrica.isAtivo()).thenReturn(true);

        Licenca licenca = org.mockito.Mockito.mock(Licenca.class);
        when(licenca.getStatus()).thenReturn(StatusLicenca.ATIVA);
        when(licenca.getId()).thenReturn(LICENCA_ID);
        when(licenca.getRubricaId()).thenReturn(RUBRICA_ID);
        when(licenca.getRubrica()).thenReturn(rubrica);
        when(licenca.getUsuarioMusica()).thenReturn(null);
        return licenca;
    }
}
