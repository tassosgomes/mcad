package br.com.ecad.distribuicao.application.dto;

import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
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
        CreditosPaginadosResponse creditos) {

    public static CalculoProcessoResponse from(
            CalculoResumoProjection resumo,
            Page<Credito> creditos) {
        return new CalculoProcessoResponse(
                resumo.processoId(),
                resumo.status(),
                resumo.rubricaSigla(),
                resumo.periodo(),
                CalculoResumoResponse.from(resumo),
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
            Instant calculadoEm) {

        private static CalculoResumoResponse from(CalculoResumoProjection resumo) {
            return new CalculoResumoResponse(
                    resumo.verbaLiquida(),
                    resumo.totalExecucoes(),
                    resumo.totalPontos(),
                    resumo.totalObras(),
                    resumo.totalCreditos(),
                    resumo.valorTotalCalculado(),
                    resumo.totalCreditosRetidos(),
                    resumo.valorTotalRetido(),
                    resumo.calculadoEm());
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
