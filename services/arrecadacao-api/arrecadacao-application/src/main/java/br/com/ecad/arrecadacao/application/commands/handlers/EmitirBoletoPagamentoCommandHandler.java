package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.PagamentoAuditEventFactory;
import br.com.ecad.arrecadacao.application.commands.EmitirBoletoPagamentoCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.LicencaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResumoResponse;
import br.com.ecad.arrecadacao.application.ports.BoletoPdfData;
import br.com.ecad.arrecadacao.application.ports.BoletoPdfGenerator;
import br.com.ecad.arrecadacao.application.ports.StorageFileClient;
import br.com.ecad.arrecadacao.application.ports.StorageUploadRequest;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.exceptions.PagamentoDuplicadoException;
import br.com.ecad.arrecadacao.domain.exceptions.UdaVigenteNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaService;
import br.org.ecad.audit.sdk.AuditClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.Map;

@Component
public class EmitirBoletoPagamentoCommandHandler
        implements CommandHandler<EmitirBoletoPagamentoCommand, PagamentoResponse> {

    private static final Logger LOGGER = LoggerFactory.getLogger(EmitirBoletoPagamentoCommandHandler.class);

    private final LicencaRepository licencaRepository;
    private final UdaValorRepository udaValorRepository;
    private final PagamentoRepository pagamentoRepository;
    private final VerbaService verbaService;
    private final BoletoPdfGenerator boletoPdfGenerator;
    private final StorageFileClient storageFileClient;
    private final OutboxEventWriter outboxEventWriter;
    private final AuditClient auditClient;
    private final PagamentoAuditEventFactory auditEventFactory;
    private final AuditContextProvider auditContextProvider;

    public EmitirBoletoPagamentoCommandHandler(
            LicencaRepository licencaRepository,
            UdaValorRepository udaValorRepository,
            PagamentoRepository pagamentoRepository,
            VerbaService verbaService,
            BoletoPdfGenerator boletoPdfGenerator,
            StorageFileClient storageFileClient,
            OutboxEventWriter outboxEventWriter,
            AuditClient auditClient,
            PagamentoAuditEventFactory auditEventFactory,
            AuditContextProvider auditContextProvider
    ) {
        this.licencaRepository = licencaRepository;
        this.udaValorRepository = udaValorRepository;
        this.pagamentoRepository = pagamentoRepository;
        this.verbaService = verbaService;
        this.boletoPdfGenerator = boletoPdfGenerator;
        this.storageFileClient = storageFileClient;
        this.outboxEventWriter = outboxEventWriter;
        this.auditClient = auditClient;
        this.auditEventFactory = auditEventFactory;
        this.auditContextProvider = auditContextProvider;
    }

    @Override
    @Transactional
    public PagamentoResponse handle(EmitirBoletoPagamentoCommand cmd) {
        Licenca licenca = licencaRepository.findById(cmd.licencaId())
                .orElseThrow(() -> new EntidadeNaoEncontradaException(
                        "Licenca nao encontrada: " + cmd.licencaId()));

        validateLicenca(licenca);

        UdaValor udaVigente = udaValorRepository.findVigente(LocalDate.now())
                .orElseThrow(() -> new UdaVigenteNaoEncontradaException(
                        "Nao ha valor de UDA vigente para a data atual (" + LocalDate.now() + ")"));

        String periodo = YearMonth.now().toString();
        if (pagamentoRepository.existsAbertoByLicencaIdAndPeriodo(cmd.licencaId(), periodo)) {
            throw new PagamentoDuplicadoException(
                    "Ja existe boleto emitido ou pagamento confirmado para a licenca no periodo " + periodo);
        }

        String rubricaSigla = licenca.getRubrica() != null ? licenca.getRubrica().getSigla() : "";
        MDC.put("rubrica", rubricaSigla);
        MDC.put("periodo", periodo);
        try {
            verbaService.validarLockParaAlteracao(licenca.getRubricaId(), periodo);

            Pagamento pagamento = Pagamento.emitirBoleto(
                    cmd.licencaId(), cmd.quantidadeUdas(), udaVigente.getValor(), cmd.dataVencimento());
            byte[] pdf = boletoPdfGenerator.generate(toPdfData(pagamento, licenca));
            var uploaded = storageFileClient.upload(new StorageUploadRequest(
                    "boleto-fake-" + pagamento.getId() + ".pdf",
                    "application/pdf",
                    pdf));

            pagamento.registrarBoletoNoStorage(uploaded.id(), uploaded.status());
            pagamento = pagamentoRepository.save(pagamento);

            outboxEventWriter.addEvent(
                    "arrecadacao.pagamento.boleto-emitido",
                    pagamento.getId().toString(),
                    buildEventPayload(pagamento));

            var auditContext = auditContextProvider.current(cmd.autor());
            auditClient.publish(auditEventFactory.userAction(pagamento, auditContext));
            auditClient.publish(auditEventFactory.dataChange(pagamento, auditContext));

            LOGGER.info("Boleto fake emitido: pagamentoId={}, storageFileId={}, periodo={}, autor={}",
                    pagamento.getId(), pagamento.getBoletoStorageFileId(), pagamento.getPeriodo(), cmd.autor());

            return toResponse(pagamento, licenca);
        } finally {
            MDC.remove("rubrica");
            MDC.remove("periodo");
        }
    }

    private void validateLicenca(Licenca licenca) {
        if (licenca.getStatus() == StatusLicenca.ENCERRADA) {
            throw new IllegalStateException(
                    "Nao e possivel emitir boleto para licenca com status ENCERRADA");
        }
        var rubrica = licenca.getRubrica();
        if (rubrica == null || !rubrica.isAtivo()) {
            throw new IllegalStateException(
                    "Rubrica está inativa e não permite emissão de boleto");
        }
    }

    private BoletoPdfData toPdfData(Pagamento pagamento, Licenca licenca) {
        var usuarioMusica = licenca.getUsuarioMusica();
        var rubrica = licenca.getRubrica();
        return new BoletoPdfData(
                pagamento.getId().toString(),
                usuarioMusica != null ? usuarioMusica.getRazaoSocial() : "Cliente fake",
                usuarioMusica != null ? usuarioMusica.getCnpj().getValor() : "00000000000000",
                rubrica != null ? rubrica.getSigla() + " - " + rubrica.getNome() : "Rubrica fake",
                pagamento.getPeriodo(),
                pagamento.getValorBruto().toPlainString(),
                pagamento.getBoletoVencimento(),
                pagamento.getBoletoNossoNumero(),
                pagamento.getBoletoLinhaDigitavel(),
                pagamento.getBoletoCodigoBarras());
    }

    private Map<String, Object> buildEventPayload(Pagamento pagamento) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("pagamentoId", pagamento.getId().toString());
        payload.put("licencaId", pagamento.getLicencaId().toString());
        payload.put("periodo", pagamento.getPeriodo());
        payload.put("valorBruto", pagamento.getValorBruto().toPlainString());
        payload.put("status", pagamento.getStatus().name());
        payload.put("boletoNossoNumero", pagamento.getBoletoNossoNumero());
        payload.put("boletoStorageFileId", pagamento.getBoletoStorageFileId());
        payload.put("boletoStorageStatus", pagamento.getBoletoStorageStatus());
        payload.put("boletoEmitidoEm", pagamento.getBoletoEmitidoEm().toString());
        return payload;
    }

    private PagamentoResponse toResponse(Pagamento pagamento, Licenca licenca) {
        return new PagamentoResponse(
                pagamento.getId(),
                buildLicencaResumo(licenca),
                pagamento.getQuantidadeUdas().toPlainString(),
                pagamento.getValorUdaNoMomento().toPlainString(),
                pagamento.getValorBruto().toPlainString(),
                pagamento.getPeriodo(),
                pagamento.getStatus().name(),
                pagamento.getDataRegistro(),
                pagamento.getCriadoEm(),
                pagamento.getAtualizadoEm(),
                pagamento.getJustificativaEstorno(),
                pagamento.getEstornadoPor(),
                null,
                pagamento.getEstornadoEm(),
                pagamento.getBoletoNossoNumero(),
                pagamento.getBoletoLinhaDigitavel(),
                pagamento.getBoletoCodigoBarras(),
                pagamento.getBoletoVencimento(),
                pagamento.getBoletoEmitidoEm());
    }

    private LicencaResumoResponse buildLicencaResumo(Licenca licenca) {
        UsuarioMusicaResumoResponse usuarioMusica = null;
        RubricaResumoResponse rubrica = null;

        if (licenca.getUsuarioMusica() != null) {
            var usuario = licenca.getUsuarioMusica();
            usuarioMusica = new UsuarioMusicaResumoResponse(
                    usuario.getId(), usuario.getRazaoSocial(), usuario.getCnpj().getValor());
        }
        if (licenca.getRubrica() != null) {
            var rubricaEntity = licenca.getRubrica();
            rubrica = new RubricaResumoResponse(
                    rubricaEntity.getId(), rubricaEntity.getSigla(), rubricaEntity.getNome(), rubricaEntity.isAtivo());
        }

        return new LicencaResumoResponse(
                licenca.getId(),
                licenca.getStatus().name(),
                usuarioMusica,
                rubrica);
    }
}
