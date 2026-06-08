package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.AjusteEstornoCalculoItemResponse;
import br.com.ecad.distribuicao.application.dto.AjusteEstornoLinhaResponse;
import br.com.ecad.distribuicao.application.dto.AjustesEstornoResponse;
import br.com.ecad.distribuicao.application.dto.CalculoProcessoResponse;
import br.com.ecad.distribuicao.application.dto.CalculoProcessoResponse.RetidoLiberadoItemResponse;
import br.com.ecad.distribuicao.application.dto.CalculoProcessoResponse.RetidosLiberadosResponse;
import br.com.ecad.distribuicao.application.queries.ConsultarCalculoProcessoQuery;
import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.entities.AjusteEstornoLinha;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.CreditoLiberacao;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.filters.CreditoFiltro;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoLinhaRepository;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoRepository;
import br.com.ecad.distribuicao.domain.interfaces.CreditoLiberacaoRepository;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.projections.CalculoResumoProjection;
import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ConsultarCalculoProcessoQueryHandler {

    private static final int MAX_PAGE_SIZE = 100;

    private final CreditoRepository creditoRepository;
    private final CreditoLiberacaoRepository creditoLiberacaoRepository;
    private final ProcessoRepository processoRepository;
    private final AjusteEstornoRepository ajusteEstornoRepository;
    private final AjusteEstornoLinhaRepository ajusteEstornoLinhaRepository;

    public ConsultarCalculoProcessoQueryHandler(
            CreditoRepository creditoRepository,
            CreditoLiberacaoRepository creditoLiberacaoRepository,
            ProcessoRepository processoRepository,
            AjusteEstornoRepository ajusteEstornoRepository,
            AjusteEstornoLinhaRepository ajusteEstornoLinhaRepository) {
        this.creditoRepository = Objects.requireNonNull(creditoRepository, "creditoRepository must not be null");
        this.creditoLiberacaoRepository = Objects.requireNonNull(
                creditoLiberacaoRepository,
                "creditoLiberacaoRepository must not be null");
        this.processoRepository = Objects.requireNonNull(processoRepository, "processoRepository must not be null");
        this.ajusteEstornoRepository = Objects.requireNonNull(
                ajusteEstornoRepository, "ajusteEstornoRepository must not be null");
        this.ajusteEstornoLinhaRepository = Objects.requireNonNull(
                ajusteEstornoLinhaRepository, "ajusteEstornoLinhaRepository must not be null");
    }

    @Transactional(readOnly = true)
    public CalculoProcessoResponse handle(ConsultarCalculoProcessoQuery query) {
        Objects.requireNonNull(query, "query must not be null");
        validatePagination(query.page(), query.size());
        CategoriaCredito categoria = parseCategoria(query.categoria());
        StatusCredito status = parseStatus(query.status());
        MotivoRetencao motivoRetencao = parseMotivoRetencao(query.motivoRetencao());

        CalculoResumoProjection resumo = creditoRepository.buscarResumo(query.processoId())
                .orElseThrow(() -> new NotFoundException(
                        "Processo de distribuição não encontrado: " + query.processoId()));
        CreditoFiltro filtro = new CreditoFiltro(
                query.processoId(),
                categoria,
                query.titularId(),
                query.obraId(),
                status,
                motivoRetencao);

        RetidosLiberadosResponse retidosLiberados = buscarRetidosLiberados(query.processoId());
        AjustesEstornoResponse ajustesEstorno = buscarAjustesEstorno(query.processoId(), resumo.status());

        return CalculoProcessoResponse.from(
                resumo,
                retidosLiberados,
                ajustesEstorno,
                creditoRepository.findByProcessoId(filtro, PageRequest.of(query.page(), query.size())));
    }

    private RetidosLiberadosResponse buscarRetidosLiberados(UUID processoId) {
        List<CreditoLiberacao> liberacoes = creditoLiberacaoRepository.findByProcessoLiberacaoId(processoId);
        Map<UUID, ProcessoDistribuicao> processosOrigem = new HashMap<>();
        List<RetidoLiberadoItemResponse> items = liberacoes.stream()
                .map(liberacao -> {
                    Credito credito = creditoRepository.findById(liberacao.getCreditoRetidoId())
                            .orElseThrow(() -> new NotFoundException(
                                    "Crédito retido não encontrado: " + liberacao.getCreditoRetidoId()));
                    ProcessoDistribuicao processoOrigem = processosOrigem.computeIfAbsent(
                            liberacao.getProcessoOrigemId(),
                            id -> processoRepository.findById(id)
                                    .orElseThrow(() -> new NotFoundException(
                                            "Processo de origem não encontrado: " + id)));
                    return RetidoLiberadoItemResponse.from(liberacao, credito, processoOrigem);
                })
                .toList();
        return RetidosLiberadosResponse.from(items);
    }

    private AjustesEstornoResponse buscarAjustesEstorno(UUID processoId, StatusProcesso statusProcesso) {
        EnumSet<StatusAjusteEstorno> statusFiltro = statusProcesso == StatusProcesso.FINALIZADO
                ? EnumSet.of(StatusAjusteEstorno.PREVISTO, StatusAjusteEstorno.APLICADO)
                : EnumSet.of(StatusAjusteEstorno.PREVISTO);

        List<AjusteEstorno> ajustes = ajusteEstornoRepository
                .findByProcessoAplicacaoIdAndStatusIn(processoId, statusFiltro);

        if (ajustes.isEmpty()) {
            return AjustesEstornoResponse.empty();
        }

        List<AjusteEstornoCalculoItemResponse> items = ajustes.stream()
                .map(ajuste -> {
                    List<AjusteEstornoLinha> linhas = ajusteEstornoLinhaRepository.findByAjusteId(ajuste.getId());
                    List<AjusteEstornoLinhaResponse> linhasResponse = linhas.stream()
                            .map(l -> new AjusteEstornoLinhaResponse(
                                    l.getId(),
                                    l.getAjusteId(),
                                    l.getProcessoOrigemId(),
                                    l.getProcessoAplicacaoId(),
                                    l.getCreditoOrigemId(),
                                    l.getTitularId(),
                                    l.getTitularNome(),
                                    l.getObraId(),
                                    l.getObraTitulo(),
                                    l.getFonogramaId(),
                                    l.getCategoria(),
                                    l.getSubcategoriaConexa(),
                                    l.getValorCreditoOrigem(),
                                    l.getValorAjuste()))
                            .toList();
                    return new AjusteEstornoCalculoItemResponse(
                            ajuste.getId(),
                            ajuste.getPagamentoId(),
                            ajuste.getLicencaId(),
                            ajuste.getPeriodoOrigem(),
                            ajuste.getProcessoOrigemId(),
                            ajuste.getStatus(),
                            ajuste.getJustificativa(),
                            ajuste.getValorEstornadoBruto(),
                            ajuste.getValorAjusteLiquido(),
                            ajuste.getValorAplicado(),
                            linhasResponse.size(),
                            linhasResponse);
                })
                .toList();

        BigDecimal valorTotal = ajustes.stream()
                .map(a -> a.getValorAplicado() != null ? a.getValorAplicado() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new AjustesEstornoResponse(items, items.size(), valorTotal);
    }

    private void validatePagination(int page, int size) {
        if (page < 0) {
            throw new PreRequisitosException("Parâmetro page deve ser maior ou igual a 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new PreRequisitosException("Parâmetro size deve estar entre 1 e " + MAX_PAGE_SIZE);
        }
    }

    private CategoriaCredito parseCategoria(String categoria) {
        if (categoria == null || categoria.isBlank()) {
            return null;
        }

        try {
            return CategoriaCredito.valueOf(categoria.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new PreRequisitosException("Categoria de crédito inválida: " + categoria);
        }
    }

    private StatusCredito parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }

        try {
            return StatusCredito.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new PreRequisitosException("Status de crédito inválido: " + status);
        }
    }

    private MotivoRetencao parseMotivoRetencao(String motivoRetencao) {
        if (motivoRetencao == null || motivoRetencao.isBlank()) {
            return null;
        }

        try {
            return MotivoRetencao.valueOf(motivoRetencao.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new PreRequisitosException("Motivo de retenção inválido: " + motivoRetencao);
        }
    }
}
