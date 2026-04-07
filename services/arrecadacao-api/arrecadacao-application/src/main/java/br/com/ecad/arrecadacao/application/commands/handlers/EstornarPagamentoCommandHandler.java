package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.EstornarPagamentoCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.LicencaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResumoResponse;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Component
public class EstornarPagamentoCommandHandler
        implements CommandHandler<EstornarPagamentoCommand, PagamentoResponse> {

    private static final Logger LOGGER = LoggerFactory.getLogger(EstornarPagamentoCommandHandler.class);

    private final PagamentoRepository pagamentoRepository;
    private final VerbaService verbaService;
    private final OutboxEventWriter outboxEventWriter;

    public EstornarPagamentoCommandHandler(PagamentoRepository pagamentoRepository,
                                           VerbaService verbaService,
                                           OutboxEventWriter outboxEventWriter) {
        this.pagamentoRepository = pagamentoRepository;
        this.verbaService = verbaService;
        this.outboxEventWriter = outboxEventWriter;
    }

    @Override
    @Transactional
    public PagamentoResponse handle(EstornarPagamentoCommand cmd) {
        // 1. Buscar pagamento (404 se não encontrado)
        Pagamento pagamento = pagamentoRepository.findById(cmd.pagamentoId())
            .orElseThrow(() -> new EntidadeNaoEncontradaException(
                "Pagamento nao encontrado: " + cmd.pagamentoId()));

        // 2. Validar lock de verba — 422 VerbaEmDistribuicaoException se EM_DISTRIBUICAO/DISTRIBUIDA
        verbaService.validarLockParaEstorno(pagamento.getLicencaId(), pagamento.getPeriodo());

        // 3. Estornar via domain method — valida status + preenche campos atomicamente
        pagamento.estornar(cmd.justificativa(), cmd.autor());

        // 4. Salvar pagamento estornado
        pagamento = pagamentoRepository.save(pagamento);

        // 5. Recalcular verba líquida do rubrica+período
        String rubricaSigla = pagamento.getLicenca().getRubrica().getSigla();
        verbaService.recalcularVerba(rubricaSigla, pagamento.getPeriodo());

        // 6. Publicar evento Outbox na mesma transação (at-least-once)
        outboxEventWriter.addEvent(
            "arrecadacao.pagamento.estornado",
            pagamento.getId().toString(),
            buildEventPayload(pagamento, rubricaSigla));

        LOGGER.info("Payment reversed: id={}, autor={}", cmd.pagamentoId(), cmd.autor());

        // 7. Mapear e retornar response
        return toResponse(pagamento);
    }

    private Map<String, Object> buildEventPayload(Pagamento pagamento, String rubricaSigla) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("pagamentoId", pagamento.getId().toString());
        payload.put("licencaId", pagamento.getLicencaId().toString());
        payload.put("rubricaSigla", rubricaSigla);
        payload.put("periodo", pagamento.getPeriodo());
        payload.put("quantidadeUdas", pagamento.getQuantidadeUdas().toPlainString());
        payload.put("valorEstornado", pagamento.getValorBruto().toPlainString());
        payload.put("justificativa", pagamento.getJustificativaEstorno());
        payload.put("estornadoPor", pagamento.getEstornadoPor());
        payload.put("estornadoEm", pagamento.getEstornadoEm().toString());
        return payload;
    }

    private PagamentoResponse toResponse(Pagamento pagamento) {
        LicencaResumoResponse licencaResumo = buildLicencaResumo(pagamento.getLicenca());
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
            pagamento.getJustificativaEstorno(),
            pagamento.getEstornadoPor(),
            pagamento.getEstornadoEm()
        );
    }

    private LicencaResumoResponse buildLicencaResumo(Licenca licenca) {
        if (licenca == null) return null;

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

        return new LicencaResumoResponse(licenca.getId(), licenca.getStatus().name(), usuarioMusica, rubrica);
    }
}
