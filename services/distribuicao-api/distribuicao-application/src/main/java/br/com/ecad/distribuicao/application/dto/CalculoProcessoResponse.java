package br.com.ecad.distribuicao.application.dto;

import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.CreditoLiberacao;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.enums.StatusLiberacaoCredito;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import br.com.ecad.distribuicao.domain.projections.CalculoResumoProjection;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;

public record CalculoProcessoResponse(
        UUID processoId,
        StatusProcesso status,
        String rubricaSigla,
        String periodo,
        CalculoResumoResponse resumo,
        RetidosLiberadosResponse retidosLiberados,
        AjustesEstornoResponse ajustesEstorno,
        CreditosPaginadosResponse creditos) {

    public static CalculoProcessoResponse from(
            CalculoResumoProjection resumo,
            Page<Credito> creditos) {
        return from(resumo, RetidosLiberadosResponse.empty(), AjustesEstornoResponse.empty(), creditos);
    }

    public static CalculoProcessoResponse from(
            CalculoResumoProjection resumo,
            RetidosLiberadosResponse retidosLiberados,
            Page<Credito> creditos) {
        return from(resumo, retidosLiberados, AjustesEstornoResponse.empty(), creditos);
    }

    public static CalculoProcessoResponse from(
            CalculoResumoProjection resumo,
            RetidosLiberadosResponse retidosLiberados,
            AjustesEstornoResponse ajustesEstorno,
            Page<Credito> creditos) {
        return new CalculoProcessoResponse(
                resumo.processoId(),
                resumo.status(),
                resumo.rubricaSigla(),
                resumo.periodo(),
                CalculoResumoResponse.from(resumo, ajustesEstorno),
                retidosLiberados,
                ajustesEstorno,
                CreditosPaginadosResponse.from(creditos));
    }

    public record CalculoResumoResponse(
            BigDecimal verbaLiquida,
            Integer totalExecucoes,
            BigDecimal totalPontos,
            Integer totalObras,
            Integer totalCreditos,
            BigDecimal valorTotalCalculado,
            Integer totalCreditosRetidos,
            BigDecimal valorTotalRetido,
            Integer totalCreditosRetidosLiberados,
            BigDecimal valorTotalRetidosLiberados,
            Instant calculadoEm,
            Integer totalAjustesEstorno,
            BigDecimal valorTotalAjustesEstorno,
            BigDecimal valorLiquidoDemonstravel) {

        private static CalculoResumoResponse from(
                CalculoResumoProjection resumo,
                AjustesEstornoResponse ajustesEstorno) {
            BigDecimal valorTotalCalculado = resumo.valorTotalCalculado() != null
                    ? resumo.valorTotalCalculado() : BigDecimal.ZERO;
            BigDecimal valorTotalRetidosLiberados = resumo.valorTotalRetidosLiberados() != null
                    ? resumo.valorTotalRetidosLiberados() : BigDecimal.ZERO;
            BigDecimal valorTotalAjustes = ajustesEstorno != null
                    ? ajustesEstorno.valorTotal() : BigDecimal.ZERO;
            int totalAjustes = ajustesEstorno != null ? ajustesEstorno.total() : 0;
            BigDecimal valorLiquidoDemonstravel = valorTotalCalculado
                    .add(valorTotalRetidosLiberados)
                    .add(valorTotalAjustes);
            return new CalculoResumoResponse(
                    resumo.verbaLiquida(),
                    resumo.totalExecucoes(),
                    resumo.totalPontos(),
                    resumo.totalObras(),
                    resumo.totalCreditos(),
                    resumo.valorTotalCalculado(),
                    resumo.totalCreditosRetidos(),
                    resumo.valorTotalRetido(),
                    resumo.totalCreditosRetidosLiberados(),
                    resumo.valorTotalRetidosLiberados(),
                    resumo.calculadoEm(),
                    totalAjustes,
                    valorTotalAjustes,
                    valorLiquidoDemonstravel);
        }
    }

    public record RetidosLiberadosResponse(
            List<RetidoLiberadoItemResponse> items,
            int total,
            BigDecimal valorTotal) {

        public static RetidosLiberadosResponse empty() {
            return new RetidosLiberadosResponse(List.of(), 0, BigDecimal.ZERO);
        }

        public static RetidosLiberadosResponse from(List<RetidoLiberadoItemResponse> items) {
            BigDecimal valorTotal = items.stream()
                    .map(RetidoLiberadoItemResponse::valorLiberado)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            return new RetidosLiberadosResponse(items, items.size(), valorTotal);
        }
    }

    public record RetidoLiberadoItemResponse(
            UUID liberacaoId,
            UUID creditoId,
            UUID processoOrigemId,
            UUID processoLiberacaoId,
            String periodoOrigem,
            StatusLiberacaoCredito status,
            UUID titularId,
            String titularNome,
            UUID obraId,
            String obraTitulo,
            UUID fonogramaId,
            CategoriaCredito categoria,
            SubcategoriaConexa subcategoriaConexa,
            BigDecimal valorLiberado,
            MotivoRetencao motivoRetencaoOriginal,
            Instant retidoEm,
            Instant avaliadoEm,
            Instant efetivadoEm) {

        public static RetidoLiberadoItemResponse from(
                CreditoLiberacao liberacao,
                Credito credito,
                ProcessoDistribuicao processoOrigem) {
            return new RetidoLiberadoItemResponse(
                    liberacao.getId(),
                    credito.getId(),
                    liberacao.getProcessoOrigemId(),
                    liberacao.getProcessoLiberacaoId(),
                    processoOrigem.getPeriodo(),
                    liberacao.getStatus(),
                    credito.getTitularId(),
                    credito.getTitularNome(),
                    credito.getObraId(),
                    credito.getObraTitulo(),
                    credito.getFonogramaId(),
                    credito.getCategoria(),
                    credito.getSubcategoriaConexa(),
                    liberacao.getValorLiberado(),
                    liberacao.getMotivoRetencaoOriginal(),
                    credito.getRetidoEm(),
                    liberacao.getAvaliadoEm(),
                    liberacao.getEfetivadoEm());
        }
    }

    public record CreditosPaginadosResponse(
            List<CreditoItemResponse> items,
            PaginationMetadata metadata) {

        private static CreditosPaginadosResponse from(Page<Credito> creditos) {
            return new CreditosPaginadosResponse(
                    creditos.getContent().stream()
                            .map(CreditoItemResponse::from)
                            .toList(),
                    new PaginationMetadata(
                            creditos.getNumber(),
                            creditos.getSize(),
                            creditos.getTotalElements(),
                            creditos.getTotalPages()));
        }
    }

    public record CreditoItemResponse(
            UUID id,
            UUID titularId,
            String titularNome,
            UUID obraId,
            String obraTitulo,
            UUID fonogramaId,
            CategoriaCredito categoria,
            SubcategoriaConexa subcategoriaConexa,
            BigDecimal percentualAplicado,
            BigDecimal valorObra,
            BigDecimal valorCredito,
            BigDecimal pontosObra,
            StatusCredito status,
            MotivoRetencao motivoRetencao,
            Instant retidoEm,
            Instant liberadoEm,
            UUID processoLiberacaoId,
            Instant criadoEm) {

        private static CreditoItemResponse from(Credito credito) {
            return new CreditoItemResponse(
                    credito.getId(),
                    credito.getTitularId(),
                    credito.getTitularNome(),
                    credito.getObraId(),
                    credito.getObraTitulo(),
                    credito.getFonogramaId(),
                    credito.getCategoria(),
                    credito.getSubcategoriaConexa(),
                    credito.getPercentualAplicado(),
                    credito.getValorObra(),
                    credito.getValorCredito(),
                    credito.getPontosObra(),
                    credito.getStatus(),
                    credito.getMotivoRetencao(),
                    credito.getRetidoEm(),
                    credito.getLiberadoEm(),
                    credito.getProcessoLiberacaoId(),
                    credito.getCriadoEm());
        }
    }

    public record PaginationMetadata(
            int page,
            int size,
            long total,
            int totalPages) {
    }
}
