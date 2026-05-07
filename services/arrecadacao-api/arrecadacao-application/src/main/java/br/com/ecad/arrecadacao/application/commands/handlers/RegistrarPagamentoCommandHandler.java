package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.PagamentoAuditEventFactory;
import br.com.ecad.arrecadacao.application.commands.RegistrarPagamentoCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.LicencaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResumoResponse;
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
import br.org.ecad.audit.sdk.AuditClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.Map;

@Component
public class RegistrarPagamentoCommandHandler
        implements CommandHandler<RegistrarPagamentoCommand, PagamentoResponse> {

    private static final Logger LOGGER = LoggerFactory.getLogger(RegistrarPagamentoCommandHandler.class);

    private final LicencaRepository licencaRepository;
    private final UdaValorRepository udaValorRepository;
    private final PagamentoRepository pagamentoRepository;
    private final OutboxEventWriter outboxEventWriter;
    private final AuditClient auditClient;
    private final PagamentoAuditEventFactory auditEventFactory;
    private final AuditContextProvider auditContextProvider;

    public RegistrarPagamentoCommandHandler(LicencaRepository licencaRepository,
                                            UdaValorRepository udaValorRepository,
                                            PagamentoRepository pagamentoRepository,
                                            OutboxEventWriter outboxEventWriter,
                                            AuditClient auditClient,
                                            PagamentoAuditEventFactory auditEventFactory,
                                            AuditContextProvider auditContextProvider) {
        this.licencaRepository = licencaRepository;
        this.udaValorRepository = udaValorRepository;
        this.pagamentoRepository = pagamentoRepository;
        this.outboxEventWriter = outboxEventWriter;
        this.auditClient = auditClient;
        this.auditEventFactory = auditEventFactory;
        this.auditContextProvider = auditContextProvider;
    }

    @Override
    @Transactional
    public PagamentoResponse handle(RegistrarPagamentoCommand cmd) {
        // 1. Buscar licenca — 404 se nao encontrada
        Licenca licenca = licencaRepository.findById(cmd.licencaId())
            .orElseThrow(() -> new EntidadeNaoEncontradaException(
                "Licenca nao encontrada: " + cmd.licencaId()));

        // 2. Validar status ATIVA/SUSPENSA — 422 se ENCERRADA
        if (licenca.getStatus() == StatusLicenca.ENCERRADA) {
            throw new IllegalStateException(
                "Nao e possivel registrar pagamento para licenca com status ENCERRADA");
        }

        // 3. Buscar UDA vigente — 422 se nao encontrada
        UdaValor udaVigente = udaValorRepository.findVigente(LocalDate.now())
            .orElseThrow(() -> new UdaVigenteNaoEncontradaException(
                "Nao ha valor de UDA vigente para a data atual (" + LocalDate.now() + ")"));

        // 4. Validar unicidade por licenca+periodo — 409 se duplicado
        String periodo = YearMonth.now().toString();
        if (pagamentoRepository.existsConfirmadoByLicencaIdAndPeriodo(cmd.licencaId(), periodo)) {
            throw new PagamentoDuplicadoException(
                "Ja existe pagamento confirmado para a licenca no periodo " + periodo);
        }

        // 5. Registrar pagamento via factory (calcula valorBruto)
        Pagamento pagamento = Pagamento.registrar(
            cmd.licencaId(), cmd.quantidadeUdas(), udaVigente.getValor());

        // 6. Salvar pagamento
        pagamento = pagamentoRepository.save(pagamento);

        LOGGER.info("Pagamento registrado: id={}, licencaId={}, periodo={}, valorBruto={}, autor={}",
            pagamento.getId(), pagamento.getLicencaId(), pagamento.getPeriodo(),
            pagamento.getValorBruto(), cmd.autor());

        // 7. Publicar evento Outbox (CloudEvents 1.0) na mesma transacao
        outboxEventWriter.addEvent(
            "arrecadacao.pagamento.registrado",
            pagamento.getId().toString(),
            buildEventPayload(pagamento));

        var auditContext = auditContextProvider.current(cmd.autor());
        auditClient.publish(auditEventFactory.userAction(pagamento, auditContext));
        auditClient.publish(auditEventFactory.dataChange(pagamento, auditContext));

        // 8. Mapear para response com licenca expandida
        return toResponse(pagamento, licenca);
    }

    private Map<String, Object> buildEventPayload(Pagamento pagamento) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("pagamentoId", pagamento.getId().toString());
        payload.put("licencaId", pagamento.getLicencaId().toString());
        payload.put("periodo", pagamento.getPeriodo());
        payload.put("quantidadeUdas", pagamento.getQuantidadeUdas().toPlainString());
        payload.put("valorUdaNoMomento", pagamento.getValorUdaNoMomento().toPlainString());
        payload.put("valorBruto", pagamento.getValorBruto().toPlainString());
        payload.put("status", pagamento.getStatus().name());
        payload.put("dataRegistro", pagamento.getDataRegistro().toString());
        return payload;
    }

    private PagamentoResponse toResponse(Pagamento pagamento, Licenca licenca) {
        LicencaResumoResponse licencaResumo = buildLicencaResumo(licenca);
        return new PagamentoResponse(
            pagamento.getId(),
            licencaResumo,
            pagamento.getQuantidadeUdas().toPlainString(),
            pagamento.getValorUdaNoMomento().toPlainString(),
            pagamento.getValorBruto().toPlainString(),
            pagamento.getPeriodo(),
            pagamento.getStatus().name(),
            pagamento.getDataRegistro(),
            pagamento.getCriadoEm(),
            pagamento.getAtualizadoEm(),
            // F06 — novos pagamentos sao sempre CONFIRMADO, campos de estorno sao null
            null, null, null
        );
    }

    private LicencaResumoResponse buildLicencaResumo(Licenca licenca) {
        UsuarioMusicaResumoResponse usuarioMusica = null;
        RubricaResumoResponse rubrica = null;

        if (licenca.getUsuarioMusica() != null) {
            var um = licenca.getUsuarioMusica();
            usuarioMusica = new UsuarioMusicaResumoResponse(
                um.getId(), um.getRazaoSocial(), um.getCnpj().getFormatado());
        }
        if (licenca.getRubrica() != null) {
            var r = licenca.getRubrica();
            rubrica = new RubricaResumoResponse(r.getId(), r.getSigla(), r.getNome());
        }

        return new LicencaResumoResponse(
            licenca.getId(),
            licenca.getStatus().name(),
            usuarioMusica,
            rubrica
        );
    }
}
