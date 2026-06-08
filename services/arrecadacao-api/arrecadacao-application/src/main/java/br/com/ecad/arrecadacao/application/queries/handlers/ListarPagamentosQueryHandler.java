package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
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

import java.util.ArrayList;
import java.util.List;

@Component
@SuppressWarnings("null")
public class ListarPagamentosQueryHandler
        implements QueryHandler<ListarPagamentosQuery, PageResponse<PagamentoResponse>> {

    private final PagamentoRepository pagamentoRepository;
    private final ActorDisplayResolver actorDisplayResolver;

    public ListarPagamentosQueryHandler(
            PagamentoRepository pagamentoRepository,
            ActorDisplayResolver actorDisplayResolver
    ) {
        this.pagamentoRepository = pagamentoRepository;
        this.actorDisplayResolver = actorDisplayResolver;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PagamentoResponse> handle(ListarPagamentosQuery query) {
        var spec = PagamentoSpecification.comFiltros(
            query.usuarioMusicaId(), query.razaoSocial(),
            query.rubricaSigla(), query.periodo(), query.status());

        var pageable = PageRequest.of(query.page(), query.size(), parseSort(query.sort()));
        var page = pagamentoRepository.findAll(spec, pageable);
        var pagamentos = page.getContent();
        var atores = resolveEstornoActors(pagamentos);

        List<PagamentoResponse> content = new ArrayList<>();
        for (int index = 0; index < pagamentos.size(); index++) {
            content.add(toResponse(pagamentos.get(index), atores.get(index)));
        }

        return new PageResponse<>(content, new PaginationInfo(
            page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages()));
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "dataRegistro");
        }
        if (sort.contains(",")) {
            String[] parts = sort.split(",", 2);
            String property = parts[0].trim();
            String direction = parts[1].trim();
            return "desc".equalsIgnoreCase(direction)
                ? Sort.by(Sort.Direction.DESC, property)
                : Sort.by(Sort.Direction.ASC, property);
        }
        if (sort.startsWith("-")) {
            return Sort.by(Sort.Direction.DESC, sort.substring(1));
        }
        return Sort.by(Sort.Direction.ASC, sort);
    }

    private List<ActorDisplayResponse> resolveEstornoActors(List<Pagamento> pagamentos) {
        List<ActorSnapshot> snapshots = pagamentos.stream()
                .filter(this::hasEstornoActor)
                .map(this::toEstornoActorSnapshot)
                .toList();
        List<ActorDisplayResponse> resolvedActors = actorDisplayResolver.resolveAll(snapshots);

        List<ActorDisplayResponse> actors = new ArrayList<>();
        int resolvedIndex = 0;
        for (Pagamento pagamento : pagamentos) {
            if (hasEstornoActor(pagamento)) {
                actors.add(resolvedActors.get(resolvedIndex));
                resolvedIndex++;
            } else {
                actors.add(null);
            }
        }
        return actors;
    }

    private boolean hasEstornoActor(Pagamento pagamento) {
        return hasText(pagamento.getEstornadoPorSubject()) || hasText(actorLabelOf(pagamento));
    }

    private PagamentoResponse toResponse(Pagamento pagamento, ActorDisplayResponse estornadoPorAtor) {
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
            estornadoPorAtor,
            pagamento.getEstornadoEm()
        );
    }

    private ActorSnapshot toEstornoActorSnapshot(Pagamento pagamento) {
        return new ActorSnapshot(
                pagamento.getEstornadoPorSubject(),
                actorLabelOf(pagamento),
                null,
                null,
                null);
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
                um.getId(), um.getRazaoSocial(), um.getCnpj().getFormatado());
        }
        if (licenca.getRubrica() != null) {
            var r = licenca.getRubrica();
            rubrica = new RubricaResumoResponse(r.getId(), r.getSigla(), r.getNome(), r.isAtivo());
        }

        return new LicencaResumoResponse(licenca.getId(), licenca.getStatus().name(), usuarioMusica, rubrica);
    }
}
