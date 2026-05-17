package br.com.ecad.distribuicao.domain.calculo;

import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

public record ParticipacaoOwnership(
        UUID titularId,
        String titularNome,
        String associacaoSigla,
        CategoriaCredito categoria,
        SubcategoriaConexa subcategoriaConexa,
        BigDecimal percentual) {

    public ParticipacaoOwnership {
        Objects.requireNonNull(titularId, "titularId must not be null");
        Objects.requireNonNull(titularNome, "titularNome must not be null");
        Objects.requireNonNull(categoria, "categoria must not be null");
        Objects.requireNonNull(percentual, "percentual must not be null");
    }
}
