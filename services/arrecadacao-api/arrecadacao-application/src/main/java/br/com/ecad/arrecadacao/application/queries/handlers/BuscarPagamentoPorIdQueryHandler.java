package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.LicencaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResumoResponse;
import br.com.ecad.arrecadacao.application.queries.BuscarPagamentoPorIdQuery;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BuscarPagamentoPorIdQueryHandler
        implements QueryHandler<BuscarPagamentoPorIdQuery, PagamentoResponse> {

    private final PagamentoRepository pagamentoRepository;
    private final ActorDisplayResolver actorDisplayResolver;

    public BuscarPagamentoPorIdQueryHandler(
            PagamentoRepository pagamentoRepository,
            ActorDisplayResolver actorDisplayResolver
    ) {
        this.pagamentoRepository = pagamentoRepository;
        this.actorDisplayResolver = actorDisplayResolver;
    }

    @Override
    @Transactional(readOnly = true)
    public PagamentoResponse handle(BuscarPagamentoPorIdQuery query) {
        var pagamento = pagamentoRepository.findById(query.id())
            .orElseThrow(() -> new EntidadeNaoEncontradaException(
                "Pagamento nao encontrado: " + query.id()));

        return toResponse(pagamento);
    }

    private PagamentoResponse toResponse(Pagamento pagamento) {
        LicencaResumoResponse licencaResumo = buildLicencaResumo(pagamento.getLicenca());
        ActorDisplayResponse estornadoPorAtor = resolveEstornoActor(pagamento);
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
            // F06 — campos de estorno (null quando CONFIRMADO)
            pagamento.getJustificativaEstorno(),
            pagamento.getEstornadoPor(),
            estornadoPorAtor,
            pagamento.getEstornadoEm(),
            pagamento.getBoletoNossoNumero(),
            pagamento.getBoletoLinhaDigitavel(),
            pagamento.getBoletoCodigoBarras(),
            pagamento.getBoletoVencimento(),
            pagamento.getBoletoStorageFileId(),
            pagamento.getBoletoStorageStatus(),
            pagamento.getBoletoEmitidoEm()
        );
    }

    private ActorDisplayResponse resolveEstornoActor(Pagamento pagamento) {
        if (!hasEstornoActor(pagamento)) {
            return null;
        }
        return actorDisplayResolver.resolve(pagamento.getEstornadoPorSubject(), actorLabelOf(pagamento));
    }

    private boolean hasEstornoActor(Pagamento pagamento) {
        return hasText(pagamento.getEstornadoPorSubject()) || hasText(actorLabelOf(pagamento));
    }

    private String actorLabelOf(Pagamento pagamento) {
        if (pagamento.getEstornadoPorRotulo() != null && !pagamento.getEstornadoPorRotulo().isBlank()) {
            return pagamento.getEstornadoPorRotulo();
        }
        return pagamento.getEstornadoPor();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private LicencaResumoResponse buildLicencaResumo(Licenca licenca) {
        if (licenca == null) return null;

        UsuarioMusicaResumoResponse usuarioMusica = null;
        RubricaResumoResponse rubrica = null;

        if (licenca.getUsuarioMusica() != null) {
            var um = licenca.getUsuarioMusica();
            usuarioMusica = new UsuarioMusicaResumoResponse(
                um.getId(), um.getRazaoSocial(), um.getCnpj().getValor());
        }
        if (licenca.getRubrica() != null) {
            var r = licenca.getRubrica();
            rubrica = new RubricaResumoResponse(r.getId(), r.getSigla(), r.getNome(), r.isAtivo());
        }

        return new LicencaResumoResponse(licenca.getId(), licenca.getStatus().name(), usuarioMusica, rubrica);
    }
}
