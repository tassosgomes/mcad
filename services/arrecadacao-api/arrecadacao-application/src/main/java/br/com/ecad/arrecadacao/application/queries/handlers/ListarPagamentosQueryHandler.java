package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.LicencaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.PaginationInfo;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResumoResponse;
import br.com.ecad.arrecadacao.application.queries.ListarPagamentosQuery;
import br.com.ecad.arrecadacao.application.specification.PagamentoSpecification;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ListarPagamentosQueryHandler
        implements QueryHandler<ListarPagamentosQuery, PageResponse<PagamentoResponse>> {

    private final PagamentoRepository pagamentoRepository;

    public ListarPagamentosQueryHandler(PagamentoRepository pagamentoRepository) {
        this.pagamentoRepository = pagamentoRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PagamentoResponse> handle(ListarPagamentosQuery query) {
        var spec = PagamentoSpecification.comFiltros(
            query.usuarioMusicaId(), query.razaoSocial(),
            query.rubricaSigla(), query.periodo(), query.status());

        var pageable = PageRequest.of(query.page(), query.size(), parseSort(query.sort()));
        var page = pagamentoRepository.findAll(spec, pageable);

        var content = page.getContent().stream()
            .map(this::toResponse)
            .toList();

        return new PageResponse<>(content, new PaginationInfo(
            page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages()));
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "dataRegistro");
        }
        if (sort.startsWith("-")) {
            return Sort.by(Sort.Direction.DESC, sort.substring(1));
        }
        return Sort.by(Sort.Direction.ASC, sort);
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
            // F06 — campos de estorno (null quando CONFIRMADO)
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
