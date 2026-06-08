package br.com.ecad.distribuicao.application.dto;

import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import java.math.BigDecimal;
import java.util.UUID;

public record AjusteEstornoLinhaResponse(
        UUID id,
        UUID ajusteId,
        UUID processoOrigemId,
        UUID processoAplicacaoId,
        UUID creditoOrigemId,
        UUID titularId,
        String titularNome,
        UUID obraId,
        String obraTitulo,
        UUID fonogramaId,
        CategoriaCredito categoria,
        SubcategoriaConexa subcategoriaConexa,
        BigDecimal valorCreditoOrigem,
        BigDecimal valorAjuste) {
}
